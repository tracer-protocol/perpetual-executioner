const verifySignature = require("@tracer-protocol/tracer-utils").verifySignature

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
    return false
  }

  //Orders must be for same market
  if (make.target_tracer !== take.target_tracer) {
    console.log("Order validation: Invalid market in pair")
    return false
  }

  return true
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

module.exports = {
  validateOrder,
  validatePair,
  validateSignature,
  validateWhitelist
}