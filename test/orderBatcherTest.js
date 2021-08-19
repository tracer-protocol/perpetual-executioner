
require('dotenv').config()
const sinon = require('sinon')
const orderSubmission = require('../orderSubmission')
const OrderBatcher = require('../OrderBatcher')
const { sampleAsk, sampleBid } = require('./mockData')
const { expect } = require('chai')

const batchSize = 2
const batchInterval = 5000
const maxAttempts = 2

let clock = sinon.useFakeTimers()

after(() => {
  clock.restore()
})

context('Order Batching', () => {
  let submitOrdersStub;
  let sendMessageToDiscordStub;
  let orderBatcher;

  beforeEach(async () => {
    // each test gets a new instance of OrderBatcher
    orderBatcher = new OrderBatcher(batchInterval, batchSize)
    submitOrdersStub = sinon.stub(orderBatcher, 'submitOrders').resolves()
    sendMessageToDiscordStub = sinon.stub(orderBatcher, 'sendMessageToDiscord').resolves()
    orderBatcher.resetProcessingQueue()
    orderBatcher.resetPendingQueue()
  })

  afterEach(() => {
    submitOrdersStub.restore()
    sendMessageToDiscordStub.restore()
  })

  it('Adds a match to the batcher', async() => {
      orderBatcher.addMatch([sampleAsk, sampleBid])

      const pendingOrders = orderBatcher.getPendingOrdersForMarket(sampleAsk.target_tracer)

      expect(pendingOrders).eql({
        count: 2,
        makeOrders: [sampleAsk],
        takeOrders: [sampleBid]
      })
  })

  it('Submits orders when the batch is full', async() => {
      orderBatcher.addMatch([sampleAsk, sampleBid])
      const mockContract = 'mockContract'
      const mockGasLimit = 'mockGasLimit'
      const mockSender = 'mockSender'

      orderBatcher.startSubmittingMatches(mockContract, mockGasLimit, mockSender, maxAttempts)
      await clock.tickAsync(5000)

      const pendingOrders = orderBatcher.getPendingOrdersForMarket(sampleAsk.target_tracer)

      expect(pendingOrders).eql({
        count: 0,
        makeOrders: [],
        takeOrders: []
      })

      expect(submitOrdersStub.callCount).eql(1)
      expect(submitOrdersStub.args[0]).eql([
        [sampleAsk],
        [sampleBid],
        mockContract,
        mockGasLimit,
        mockSender
      ])
  })

  it('Attempts up to the maxAttempts and then abandons batch', async() => {
    // force submission to fail
    submitOrdersStub.restore()
    submitOrdersStub = sinon.stub(orderSubmission, 'submitOrders').rejects(new Error('Test Error'))

    orderBatcher.addMatch([sampleAsk, sampleBid])
    const mockContract = 'mockContract'
    const mockGasLimit = 'mockGasLimit'
    const mockSender = 'mockSender'

    orderBatcher.startSubmittingMatches(mockContract, mockGasLimit, mockSender, maxAttempts)
    await clock.tickAsync(5000)

    const pendingOrders = orderBatcher.getPendingOrdersForMarket(sampleAsk.target_tracer)

    expect(pendingOrders).eql({
      count: 0,
      makeOrders: [],
      takeOrders: []
    })

    expect(submitOrdersStub.callCount).eql(maxAttempts)
    const expectedSubmissionAttempts = Array(maxAttempts).fill([
      [sampleAsk],
      [sampleBid],
      mockContract,
      mockGasLimit,
      mockSender
    ])
    expect(submitOrdersStub.args).eql(expectedSubmissionAttempts)

    expect(sendMessageToDiscordStub.callCount).eql(maxAttempts)
    expect(sendMessageToDiscordStub.args).eql([
      [`ERROR SUBMITTING BATCH (ATTEMPT 1): Test Error\n ${JSON.stringify([[sampleAsk, sampleBid]], null, 2)}`],
      [`ERROR SUBMITTING BATCH (ATTEMPT 2): Test Error\n ${JSON.stringify([[sampleAsk, sampleBid]], null, 2)}`]
    ])
  })
})

