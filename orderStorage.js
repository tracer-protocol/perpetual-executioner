/**
 * Class for holding orders.
 * Uses mappings to map from a specific market (represented by a Ethereum address) to the orders for that market
 */
class OrderStorage {

    constructor() {
        this.makeOrders = new Array()
        this.takeOrders = new Array()
        this.totalOrders = 0
    }


    getAllOrders() {
        return [this.makeOrders, this.takeOrders, this.totalOrders]
    }

    getOrderCounter() {
        return this.totalOrders
    }

    addOrders(make, take) {
        // check executioner is in a healthy state at all times
        if (this.takeOrders.length != this.makeOrders.length) {
            //raise alerts, executioner is unhealthy
            console.log("ERROR: Maker Taker mismatch")
            return
        }

        // add orders
        this.makeOrders.push(make)
        this.takeOrders.push(take)
        this.totalOrders += 2
    }

    clearOrders() {
        this.makeOrders = new Array()
        this.takeOrders = new Array()
        this.totalOrders = 0
    }
}

module.exports = {
    OrderStorage
}