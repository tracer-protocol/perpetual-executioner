let serialiseOrder = require("./orderSerialisation").serialiseOrder


const submitOrders = async (makerOrders, takerOrders, contract, market) => {
    
    let serialisedMakeOrders = makerOrders.map((order) => serialiseOrder(order))
    let serialisedTakeOrders = takerOrders.map((order) => serialiseOrder(order))

    await contract.methods.executeTrade(serialisedMakeOrders, serialisedTakeOrders, market)
}