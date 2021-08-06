const {
  verifySignature,
  calcPositionAfterTrade,
  calcTotalMargin,
  calcMinimumMargin,
  API_CODES
} = require("@tracer-protocol/tracer-utils")
const BigNumber = require('bignumber.js')

/**
 * Validates a single order to ensure that orders are not transmitted on chain that will fail.
 */
const validateOrder = (order) => {
  //Require all fields
  if (order.user === undefined ||
    order.target_tracer === undefined ||
    order.side === undefined ||
    order.price === undefined ||
    order.amount === undefined ||
    order.expiration === undefined ||
    order.signed_data === undefined) {
    console.log("Order Validation: Invalid field in order")
    return false
  }

  //Side must be ask or bid
  if (order.side !== "Ask" && order.side !== "Bid") {
    console.log(order.side)
    console.log("Order Validation: Invalid value for side in order")
    return false
  }

  return true
}

/**
 * Validates a pair of orders. Should be used after using validateOrder on both individual order. This ensures
 * the pair of orders can be processed together.
 */
const validatePair = (make, take) => {

  //Orders are same side, not valid
  if (make.side === take.side) {
    console.log("Order validation: Invalid value for side in pair")
    return {
      message: API_CODES.ORDERS_SAME_SIDE,
      isValid: false
    }
  }

  //Orders must be for same market
  if (make.target_tracer.toLowerCase() !== take.target_tracer.toLowerCase()) {
    console.log(`Order validation: Invalid market in pair - maker ${make.target_tracer} and taker ${take.target_tracer}`)
    return {
      message: API_CODES.MARKET_MISMATCH,
      isValid: false
    }
  }

  // check that the orders cross
  const askPrice = make.side === 'Ask' ? make.price : take.price
  const bidPrice = make.side === 'Bid' ? make.price : take.price

  if(!BigNumber(bidPrice).gte(BigNumber(askPrice))) {
    console.log("Order validation: Prices do not cross")
    return {
      message: API_CODES.PRICE_NOT_CROSSED,
      isValid: false
    }
  }

  return {
    message: 'Pair is valid',
    isValid: true
  }
}

/**
 * Verifies if a certain signer was correctly signed by the order maker
 */
const validateSignature = (order, trader, network, sig) => {
  return verifySignature(order, trader, sig, order.maker, network)
}

/**
 * Validates if an address is whitelisted to trade
 */
const validateWhitelist = (web3, address) => {
  // whitelist is passed in as a csv string
  let whitelist = process.env.WHITELIST.split(",")
  whitelist = whitelist.map((_address) => web3.utils.toChecksumAddress(_address))
  return whitelist.includes(web3.utils.toChecksumAddress(address))
}

/**
 * Validates if a timestamp is valid and before or equal to now
 */
const validateCreatedTime = (created) => {
  return (
    created != null &&
    !isNaN(created) &&
    Number(created) <= parseInt(Date.now() / 1000)
  )
}

/**
 * Validates if a timestamp is valid and after now
 */
const validateExpiryTime = (expiry) => {
  return (
    expiry != null &&
    !isNaN(expiry) &&
    Number(expiry) >= parseInt(Date.now() / 1000)
  )
}

const validateMarginAfterTrade = ({ currentPosition, trade, feeRate, maxLeverage, fairPrice } = {}) => {
  const positionAfterTrade = calcPositionAfterTrade({
      quote: currentPosition.quote,
      base: currentPosition.base
    },
    {
        amount: trade.amount,
        price: trade.price,
        position: trade.side
    },
    feeRate
  )

  const marginAfterTrade = calcTotalMargin(
    positionAfterTrade.quote,
    positionAfterTrade.base,
    fairPrice
  )

  const minimumMarginAfterTrade = calcMinimumMargin(
    positionAfterTrade.quote,
    positionAfterTrade.base,
    fairPrice,
    maxLeverage
  )

  return marginAfterTrade.gte(minimumMarginAfterTrade)
}

module.exports = {
  validateOrder,
  validatePair,
  validateSignature,
  validateWhitelist,
  validateCreatedTime,
  validateExpiryTime,
  validateMarginAfterTrade
}