const Bottleneck = require('bottleneck');
const orderSubmission = require('./orderSubmission')

class OrderBatcher {
  constructor(batchInterval, batchSize) {
    this.processingQueue = []
    this.pendingQueue = []
    this.isSubmitting = false
    this.batchInterval = batchInterval
    this.batchSize = batchSize

    this.batcher = new Bottleneck.Batcher({
      maxConcurrent: 1,
      maxTime: this.batchInterval,
      maxSize: this.batchSize
    })

    this.batcher.on('batch', async batch => {
      this.processingQueue.push(batch)
    })
  }

  async submitMatchesRecursively (contract, gasLimit, sender, maxAttempts) {
    if(this.isSubmitting) {
      const nextBatch = this.processingQueue.shift()

      if(nextBatch) {
        if(!nextBatch.attempts) {
          nextBatch.attempts = 0
        };


        try {
          // register the attempt on the batch item
          nextBatch.attempts += 1

          const makerOrders = []
          const takerOrders = []
          for(const match of nextBatch) {
            makerOrders.push(match[0])
            takerOrders.push(match[1])
          }


          await this.submitOrders(makerOrders, takerOrders, contract, gasLimit, sender)
          this.removePendingMatches(nextBatch)
        } catch (error) {
          console.log(`ERROR SUBMITTING BATCH (ATTEMPT ${nextBatch.attempts})`, error.message, JSON.stringify(nextBatch, null, 2))
          // if there are still attempts left
          if(nextBatch.attempts <= maxAttempts) {
            // add it back to the start of the queue for retrying
            this.processingQueue.unshift(nextBatch);
          } else {
            // no attempts left, remove them from pending matches
            this.removePendingMatches(nextBatch)
          }
        }
      } else {
        // if there is nothing to do, wait and check again
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      this.submitMatchesRecursively(contract, gasLimit, sender, maxAttempts)
    } else {
      // check every second if submissions have been resumed
      await new Promise(resolve => setTimeout(resolve, 1000))
      this.submitMatchesRecursively(contract, gasLimit, sender, maxAttempts)
    }
  }

  async submitOrders (...args) {
    return orderSubmission.submitOrders(...args)
  }

  removePendingMatches (batch) {
    const makerIdLookup = {}
    const takerIdLookup = {}
    for (let match of batch) {
      makerIdLookup[match[0].id] = true
      takerIdLookup[match[1].id] = true
    }

    this.pendingQueue = this.pendingQueue.filter(pendingMatch => {
      return !makerIdLookup[pendingMatch[0].id] && !takerIdLookup[pendingMatch[1].id]
    })
  }

  getPendingOrdersForMarket (marketId) {
    const matches = this.pendingQueue.filter(([pendingMaker]) => pendingMaker.target_tracer === marketId)

    return {
      makeOrders: matches.map(match => match[0]),
      takeOrders: matches.map(match => match[1]),
      count: matches.length * 2
    }
  }

  addMatch (pair) {
    this.pendingQueue.push(pair)
    this.batcher.add(pair)
  }

  startSubmittingMatches = (contract, gasLimit, sender, maxAttempts) => {
    console.log(`
        Starting Match Submission\n
        batchInterval: ${this.batchInterval}\n
        batchSize: ${this.batchSize}\n
        maxAttempts: ${maxAttempts}\n
    `)
    if(!this.isSubmitting) {
      this.isSubmitting = true
      this.submitMatchesRecursively(contract, gasLimit, sender, maxAttempts)
    }
  }

  stopSubmittingMatches () {
    this.isSubmitting = false
  }

  resetProcessingQueue = () => {
    this.processingQueue = []
  }

  resetPendingQueue = () => {
    this.pendingQueue = []
  }
}

module.exports = OrderBatcher
