let assert = require('assert');
const { OrderStorage } = require('../orderStorage');
require('dotenv').config()
let Web3 = require('web3');
let web3 = new Web3(process.env.ETH_URL)

//EIP712 Signature Example
let exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"
const sampleOrder1 = {
    "id": 0,
    "address": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "market": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "flags": { "bits": 1 },
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const sampleOrder2 = {
    "id": 0,
    "address": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "market": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "side": "Ask",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "flags": { "bits": 1 },
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const sampleMarket1 = "0x529da3408a37a91c8154c64f3628db4eaa7b8da2"
const sampleMarket2 = "0x529da3408a37a91c8154c64f3628db4eaa7b8db3"

let orderStorage
beforeEach(() => {
    orderStorage = new OrderStorage()
})

context('Initialises', async () => {
    it('Has no markets', async() => {
        let allOrders = orderStorage.getAllOrders()
        console.log(allOrders)
        assert.notStrictEqual(allOrders[0], new Array())
        assert.notStrictEqual(allOrders[1], new Array())
        assert.strictEqual(allOrders[2], 0)
    })
});

context('Adding orders', async() => {
    it('Adds orders successfully to multiple markets', async () => {
        orderStorage.addOrders(sampleOrder1, sampleOrder2, sampleMarket1)
        orderStorage.addOrders(sampleOrder1, sampleOrder2, sampleMarket2)
        
        //Get all orders
        let allOrders = orderStorage.getAllOrders(sampleMarket1)

        //Validate
        assert.strictEqual(allOrders[0].length, 2)
        assert.strictEqual(allOrders[1].length, 2)
        assert.strictEqual(allOrders[2], 4)
        assert.strictEqual(allOrders[0][0], sampleOrder1)
        assert.strictEqual(allOrders[1][0], sampleOrder2)
        assert.strictEqual(allOrders[0][1], sampleOrder1)
        assert.strictEqual(allOrders[1][1], sampleOrder2)
    })
})

context('Clearing orders', async() => {
    it('Can clear an order book', async() => {
        orderStorage.addOrders(sampleOrder1, sampleOrder2)
        orderStorage.addOrders(sampleOrder1, sampleOrder2)

        orderStorage.clearOrders()

        //Market 1 should now be cleared
        let allOrders = orderStorage.getAllOrders()

        assert.strictEqual(allOrders[0].length, 0)
        assert.strictEqual(allOrders[1].length, 0)
        assert.strictEqual(allOrders[2], 0)
    })
})
