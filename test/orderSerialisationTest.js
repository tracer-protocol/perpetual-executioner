let assert = require('assert');
const omeOrderToOrder = require('@tracer-protocol/tracer-utils').omeOrderToOrder;
require('dotenv').config()
let Web3 = require('web3');
let web3 = new Web3(process.env.ETH_URL)

//EIP712 Signature Example
let exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"
const sampleOMEOrder = {
    "id": 0,
    "user": "0x529da3408a37a91c8154c64f3628db4eaa7b8da3",
    "target_tracer": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
    "side": "Bid",
    "price": 12,
    "amount": 5,
    "expiration": 1596600983,
    "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const sampleSerialisedOrder = {
    order: {
        amount: "5",
        price: "12",
        side: true,
        user: web3.utils.toChecksumAddress("0x529da3408a37a91c8154c64f3628db4eaa7b8da3"),
        expiration: 1596600983,
        targetTracer: web3.utils.toChecksumAddress("0x529da3408a37a91c8154c64f3628db4eaa7b8da2"),
    },
    sigR: "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e60395072", //first 32 bytes of sigRaw
    sigS: "0x35ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc", //next 32 bytes of sigRaw
    sigV: parseInt("0x1b", 16)
}

context("Serialisation", async() => {
    it('Correctly serialises orders', async() => {
        let serialised = omeOrderToOrder(web3, sampleOMEOrder)
        assert.notStrictEqual(serialised, sampleSerialisedOrder)
    })
})
