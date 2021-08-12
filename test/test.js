const assert = require('assert');
const sinon = require('sinon')
const fetch = require('node-fetch');
require('dotenv').config()
const Web3 = require('web3');
const web3 = new Web3(process.env.ETH_URL)

//Startup the server
require("../index")
const orderBatcher = require('../orderBatcherSingleton')

//EIP712 Signature Example
const exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"
const target_tracer = "0x529da3408a37a91c8154c64f3628db4eaa7b8da2"
const user = "0x110af92Ba116fD7868216AA794a7E4dA3b9D7D11"

const sampleOrder1 = {
    "id": 0,
    "user": user,
    "target_tracer": target_tracer,
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": parseInt(Date.now() / 1000) + 1000,
    "created": parseInt(Date.now() / 1000),
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const sampleOrder2 = {
    "id": 0,
    "user": user,
    "target_tracer": target_tracer,
    "side": "Ask",
    "price": 12,
    "amount": 5,
    "expiration": parseInt(Date.now() / 1000) + 1000,
    "created": parseInt(Date.now() / 1000),
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const faultyOrder = {
    "id": 0,
    "user": user,
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

let orderSubmissionStub;

before(() => {
    orderSubmissionStub = sinon.stub(orderBatcher, 'submitOrders').resolves()
})

after(() => {
    orderSubmissionStub.restore()
    orderBatcher.stopSubmittingMatches()
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

    let pendingOrders = await fetch(`http://localhost:3000/pending-orders/${target_tracer}`)
    let result = await pendingOrders.json()
    //20 orders from this test, 2 from test 2
    assert.strictEqual(result.count, 22)
})