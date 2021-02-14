let serialiseOrder = require("./orderSerialisation").serialiseOrder


const submitOrders = async (makerOrders, takerOrders, contract, market) => {
    
    let serialisedMakeOrders = makerOrders.map((order) => serialiseOrder(order))
    let serialisedTakeOrders = takerOrders.map((order) => serialiseOrder(order))
    console.log(serialisedMakeOrders)
    console.log(serialisedTakeOrders)
    console.log(market)
    let txn = await contract.methods.executeTrade(serialisedMakeOrders, serialisedTakeOrders, market).send()
    console.log(txn)
}

module.exports = {
    submitOrders
}