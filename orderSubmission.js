let serialiseOrder = require("./orderSerialisation").serialiseOrder


/**
 * Submit orders to the on chain trader contract.
 */
const submitOrders = async (makerOrders, takerOrders, contract, market, sendingAccount) => {
    let serialisedMakeOrders = makerOrders.map((order) => serialiseOrder(order))
    let serialisedTakeOrders = takerOrders.map((order) => serialiseOrder(order))
    try {
        let txn = await contract.methods.executeTrade(serialisedMakeOrders, serialisedTakeOrders, market).send({ from: sendingAccount, gas: "200000"})
        return txn
    } catch (e) {
        console.error(e)
    }
}

module.exports = {
    submitOrders
}