//let serialiseOrder = require("./orderSerialisation").serialiseOrder
let omeOrderToOrder = require("@tracer-protocol/tracer-utils").omeOrderToOrder
const web3 = require("web3")

/**
 * Submit orders to the on chain trader contract.
 */
const submitOrders = async (makerOrders, takerOrders, contract, gasLimit) => {
    let serialisedMakeOrders = makerOrders.map((order) => omeOrderToOrder(web3, order))
    let serialisedTakeOrders = takerOrders.map((order) => omeOrderToOrder(web3, order))
    try {
        return await contract.executeTrade(serialisedMakeOrders, serialisedTakeOrders, { gasLimit: gasLimit})
    } catch (e) {
        console.error(e)
        throw e
    }
}

module.exports = {
    submitOrders
}