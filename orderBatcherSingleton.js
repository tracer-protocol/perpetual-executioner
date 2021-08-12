const OrderBatcher = require('./OrderBatcher')

const batchInterval = process.env.SUBMISSION_BATCH_MS ? Number(process.env.SUBMISSION_BATCH_MS) : 5000
const batchSize = process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : 1
const orderBatcher = new OrderBatcher(batchInterval, batchSize)

module.exports = orderBatcher