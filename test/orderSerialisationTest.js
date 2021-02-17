let assert = require('assert');
const { serialiseOrder } = require('../orderSerialisation');
require('dotenv').config()
let Web3 = require('web3');
let web3 = new Web3(process.env.ETH_URL)

//EIP712 Signature Example
let exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"
const sampleOMEOrder = {
    "id": 0,
    "address": "0x529da3408a37a91c8154c64f3628db4eaa7b8da3",
    "market": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "flags": { "bits": 1 },
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
    "nonce": "0x44"
}

const sampleSerialisedOrder = {
    limitOrder: {
        amount: 5,
        price: 12,
        side: true,
        user: "0x529da3408a37a91c8154c64f3628db4eaa7b8da3",
        expiration: 1596600983,
        targetTracer: "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
        nonce: "0x44"
    },
    sigR: "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e60395072", //first 32 bytes of sigRaw
    sigS: "0x35ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc", //next 32 bytes of sigRaw
    sigV: parseInt("0x1b", 16)
}



const sampleMarket1 = "0x529da3408a37a91c8154c64f3628db4eaa7b8da3"
const sampleMarket2 = "0x529da3408a37a91c8154c64f3628db4eaa7b8db3"

context("Serialisation", async() => {
    let serialised = serialiseOrder(sampleOMEOrder)
    assert.strictEqual(serialised, sampleSerialisedOrder)
})
