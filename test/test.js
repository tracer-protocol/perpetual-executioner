let assert = require('assert');
let fetch = require('node-fetch');
require('dotenv').config()
let Web3 = require('web3');
let web3 = new Web3(process.env.ETH_URL)
//Startup the server
require("../index")

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
    "nonce": "0x44"
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
    "nonce": "0x44"
}

const faultyOrder = {
    "id": 0,
    "address": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "flags": { "bits": 1 },
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
    "nonce": "0x44"
}

beforeEach(async() => {

})

it('Healthcheck on / endpoint', async () => {
    let req = await fetch('http://localhost:3000')
    assert.strictEqual(req.ok, true)
});

it('Accepts orders of the correct format', async () => {
    let data = {
        "maker": sampleOrder1,
        "taker": sampleOrder2
    }

    let req = await fetch('http://localhost:3000/submit', { method: "POST", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
    assert.strictEqual(req.ok, true)
})

it('Rejects with missing fields', async () => {

    let data = {
        "maker": faultyOrder,
        "taker": sampleOrder2
    }

    let req = await fetch('http://localhost:3000/submit', { method: "POST", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
    assert.strictEqual(req.ok, false)
})

it('Kepers track of records', async () => {
    //Send 20 orders
    let data = {
        "maker": sampleOrder1,
        "taker": sampleOrder2
    }
    for (var i = 0; i < 10; i++) {
        await fetch('http://localhost:3000/submit', { method: "POST", body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
    }

    let pendingOrders = await fetch(`http://localhost:3000/pending-orders/0x529da3408a37a91c8154c64f3628db4eaa7b8da2`)
    let result = await pendingOrders.json()
    //20 orders from this test, 2 from test 2
    assert.strictEqual(result.count, 22)
})