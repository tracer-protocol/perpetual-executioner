let assert = require('assert');
const { OrderStorage } = require('../orderStorage');
const {
  validateCreatedTime,
  validateExpiryTime,
  validatePair
} = require('../orderValidation');
require('dotenv').config()
let Web3 = require('web3');
let web3 = new Web3(process.env.ETH_URL)

//EIP712 Signature Example
let exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"
const sampleBid = {
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

const sampleAsk = {
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

context('Validating Pairs', async() => {
    it('[make is Ask] Is invalid if the prices do not cross', async () => {
      const result = validatePair({ ...sampleAsk, price: 15 }, { ...sampleBid, price: 10 })

      assert.strictEqual(false, result)
    })

    it('[make is Bid] Is invalid if the prices do not cross', async () => {
      const result = validatePair({ ...sampleBid, price: 10 }, { ...sampleAsk, price: 15 })

      assert.strictEqual(false, result)
    })

    it('[make is Ask] Is valid if the prices do cross', async () => {
      const result = validatePair(sampleAsk, sampleBid)

      assert.strictEqual(true, result)
    })

    it('[make is Bid] Is valid if the prices do cross', async () => {
      const result = validatePair(sampleBid, sampleAsk)

      assert.strictEqual(true, result)
    })

    it('Is invalid if the orders are not on the same market', async () => {
      const result = validatePair(
        { ...sampleBid, target_tracer: sampleMarket1 },
        { ...sampleAsk, target_tracer: sampleMarket2 }
      )

      assert.strictEqual(false, result)
    })
})

context('Validating Created Time', async() => {
    it('Is invalid if null', async() => {
      assert.strictEqual(false, validateCreatedTime(null))
    })

    it('Is invalid if NaN', async() => {
      assert.strictEqual(false, validateCreatedTime('this is not a number'))
    })

    it('Is invalid if in the future', async() => {
      assert.strictEqual(false, validateCreatedTime(Date.now() + 100))
    })

    it('Is valid if a number now or in the past', async() => {
      assert.strictEqual(true, validateCreatedTime(Date.now()))
    })
})

context('Validating Expiry Time', async() => {
  it('Is invalid if null', async() => {
    assert.strictEqual(false, validateExpiryTime(null))
  })

  it('Is invalid if NaN', async() => {
    assert.strictEqual(false, validateExpiryTime('this is not a number'))
  })

  it('Is invalid if in the past', async() => {
    assert.strictEqual(false, validateExpiryTime(Date.now() - 100))
  })

  it('Is valid if in the future', async() => {
    assert.strictEqual(true, validateExpiryTime(Date.now() + 100))
  })
})
