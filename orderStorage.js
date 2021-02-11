class OrderStorage {

    constructor() {
        this.makeOrders = new Map()
        this.takeOrders = new Map()
        this.orderCounter = new Map()
    }


    getAllOrders(market) {
        if (this.makeOrders.has(market)) {
            return [this.makeOrders.get(market), this.takeOrders.get(market), this.orderCounter.get(market)]
        } else {
            return null
        }
    }

    getOrderCounter(market) {
        if (this.orderCounter.has(market)) {
            return this.orderCounter.get(market)
        } else {
            return 0
        }
    }

    addOrders(make, take, market) {
        //init market if needed
        if (!this.makeOrders.has(market)) {
            this.clearMarket(market)
        }

        let makes = this.makeOrders.get(market) 
        let takes = this.takeOrders.get(market)
        let count = this.orderCounter.get(market)

        makes.push(make)
        takes.push(take)
        count += 2
        this.makeOrders.set(market, makes)
        this.takeOrders.set(market, takes)
        this.orderCounter.set(market, count)
    }

    clearMarket(market) {
        this.makeOrders.set(market, new Array())
        this.takeOrders.set(market, new Array())
        this.orderCounter.set(market, 0)
    }
}

module.exports = {
    OrderStorage
}