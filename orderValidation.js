const validateOrder = (order) => {
  //Require all fields
  if (order.id === undefined ||
      order.address === undefined ||
      order.market === undefined || 
      order.side === undefined ||
      order.price === undefined ||
      order.amount === undefined ||
      order.expiration === undefined ||
      order.flags === undefined ||
      order.signed_data === undefined ||
      order.nonce === undefined) {
    console.log("Invalid field in order")
    return false
  }

  //Side must be ask or bid
  if (order.side !== "Ask" && order.side !== "Bid") {
    console.log(order.side)
    console.log("Invalid side in order")
    return false
  }

  return true
}

//To be used after validate order. Validates a pair of orders work together
const validatePair = (make, take) => {

  //Orders are same side, not valid
  if (make.side === take.side) {
    console.log("Invalid side")
    return false
  }

  //Orders must be for same market
  if (make.market !== take.market) {
    console.log("Invalid market")
    return false
  }

  return true
}

module.exports = {
  validateOrder,
  validatePair
}