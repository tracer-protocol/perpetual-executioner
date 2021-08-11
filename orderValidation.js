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
  if(!order) {
    return { isValid: false, message: 'order not supplied' };
  }

  const requiredFields = [
    'user',
    'target_tracer',
    'side',
    'price',
    'amount',
    'expiration',
    'signed_data'
  ];

  let missingFields = [];

  for(const fieldName of requiredFields) {
    if(!order[fieldName]) {
      missingFields.push(fieldName);
    }
  }

  if(missingFields.length) {
    return { isValid: false, message: `missing the following fields: ${missingFields.join(', ')}` };
  }

  // validate specific fields
  if (order.side !== "Ask" && order.side !== "Bid") {
    return { isValid: false, message: `invalid side: ${order.side}` };
  }

  // check order expiry
  const isValidExpiryTime = validateExpiryTime(order.expiration);

  if(!isValidExpiryTime) {
    return { isValid: false, message: API_CODES.INVALID_EXPIRY_TIMESTAMP };
  }

  return { isValid: true, message: 'order is valid' };
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
  validateCreatedTime,
  validateExpiryTime,
  validateMarginAfterTrade
}