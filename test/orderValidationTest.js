let assert = require('assert');
const {
  validateCreatedTime,
  validateExpiryTime,
  validatePair,
  validateMarginAfterTrade,
  validateOrder
} = require('../orderValidation');
const { default: BigNumber } = require('bignumber.js')
require('dotenv').config()
const { API_CODES } = require('@tracer-protocol/tracer-utils');
const { sampleAsk, sampleBid } = require('./mockData')

const sampleMarket1 = "0x529da3408a37a91c8154c64f3628db4eaa7b8da2"
const sampleMarket2 = "0x529da3408a37a91c8154c64f3628db4eaa7b8db3"

context('Validating Pairs', () => {
    it('[make is Ask] Is invalid if the prices do not cross', () => {
      const result = validatePair({ ...sampleAsk, price: 15 }, { ...sampleBid, price: 10 })

      assert.deepEqual(result, {
        message: API_CODES.PRICE_NOT_CROSSED,
        isValid: false,
      })
    })

    it('[make is Bid] Is invalid if the prices do not cross', () => {
      const result = validatePair({ ...sampleBid, price: 10 }, { ...sampleAsk, price: 15 })

      assert.deepEqual(result, {
        message: API_CODES.PRICE_NOT_CROSSED,
        isValid: false,
      })
    })

    it('[make is Ask] Is valid if the prices do cross', () => {
      const result = validatePair(sampleAsk, sampleBid)

      assert.deepEqual(result, {
        message: 'Pair is valid',
        isValid: true,
      })
    })

    it('[make is Bid] Is valid if the prices do cross', () => {
      const result = validatePair(sampleBid, sampleAsk)

      assert.deepEqual(result, {
        message: 'Pair is valid',
        isValid: true,
      })
    })

    it('Is invalid if the orders are not on the same market', () => {
      const result = validatePair(
        { ...sampleBid, target_tracer: sampleMarket1 },
        { ...sampleAsk, target_tracer: sampleMarket2 }
      )

      assert.deepEqual(result, {
        message: API_CODES.MARKET_MISMATCH,
        isValid: false,
      })
    })
})

context('Validating Created Time', () => {
    it('Is invalid if null', () => {
      assert.strictEqual(false, validateCreatedTime(null))
    })

    it('Is invalid if NaN', () => {
      assert.strictEqual(false, validateCreatedTime('this is not a number'))
    })

    it('Is invalid if in the future', () => {
      assert.strictEqual(false, validateCreatedTime(parseInt(Date.now() / 1000) + 100))
    })

    it('Is valid if a number now or in the past', () => {
      assert.strictEqual(true, validateCreatedTime(parseInt(Date.now() / 1000)))
    })
})

context('Validating Expiry Time', () => {
  it('Is invalid if null', () => {
    assert.strictEqual(false, validateExpiryTime(null))
  })

  it('Is invalid if NaN', () => {
    assert.strictEqual(false, validateExpiryTime('this is not a number'))
  })

  it('Is invalid if in the past', () => {
    assert.strictEqual(false, validateExpiryTime(parseInt(Date.now() / 1000) - 100))
  })

  it('Is valid if in the future', () => {
    assert.strictEqual(true, validateExpiryTime(parseInt(Date.now() / 1000) + 100))
  })
})

context('Validating Order', () => {
  context('missing fields', () => {
    const fieldsToTest = [
      'user',
      'target_tracer',
      'side',
      'price',
      'amount',
      'expiration',
      'signed_data'
    ]

    for(const field of fieldsToTest) {
      it(`invalid if missing ${field}`, () => {
        const result = validateOrder({
          ...sampleAsk,
          [field]: undefined
        })

        assert.deepEqual(result, {
          isValid: false,
          message: `missing the following fields: ${field}`
        })
      })
    }
  })

  it('invalid if missing multiple fields', () => {
    const result = validateOrder({
      ...sampleAsk,
      user: undefined,
      target_tracer: undefined
    })

    assert.deepEqual(result, {
      isValid: false,
      message: 'missing the following fields: user, target_tracer'
    })
  })

  it('invalid if side is not "Bid" or "Ask"', () => {
    const result = validateOrder({
      ...sampleAsk,
      side: 'Wrong'
    })

    assert.deepEqual(result, {
      isValid: false,
      message: 'invalid side: Wrong'
    })
  })

  it('invalid if order is past expiry', () => {
    const result = validateOrder({
      ...sampleAsk,
      expiration: parseInt(Date.now() / 1000) - 1000
    })

    assert.deepEqual(result, {
      isValid: false,
      message: API_CODES.INVALID_EXPIRY_TIMESTAMP
    })
  })
})

context('Validating Margin After Trading', () => {
  it('is valid if the position has not borrowed anything', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('10000'),
            base: new BigNumber('1')
        },
        trade: {
            amount: new BigNumber('1'),
            price: new BigNumber('1000'),
            side: 0 // buy
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('1000')
    })

    assert.strictEqual(true, isValidMarginAfterTrade)
  })

  it('is valid if the position has borrowed quote asset but is still over margin', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('100'),
            base: new BigNumber('0')
        },
        trade: {
            amount: new BigNumber('1'),
            price: new BigNumber('800'),
            side: 0 // buy
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('800')
    })

    assert.strictEqual(true, isValidMarginAfterTrade)
  })

  it('is valid if the position has borrowed base asset but is still over margin', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('100'),
            base: new BigNumber('0')
        },
        trade: {
            amount: new BigNumber('1'),
            price: new BigNumber('800'),
            side: 1 // sell
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('800')
    })

    assert.strictEqual(true, isValidMarginAfterTrade)
  })

  it('is invalid if the position has borrowed quote asset and is under margin', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('100'),
            base: new BigNumber('0')
        },
        trade: {
            amount: new BigNumber('15'),
            price: new BigNumber('100'),
            side: 0 // buy
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('100')
    })

    assert.strictEqual(false, isValidMarginAfterTrade)
  })

  it('is invalid if the position has borrowed base asset is under margin after trading', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('100'),
            base: new BigNumber('0')
        },
        trade: {
            amount: new BigNumber('1'),
            price: new BigNumber('1500'), // 15x
            side: 1 // sell
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('1500')
    })

    assert.strictEqual(false, isValidMarginAfterTrade)
  })

  it('is invalid if the position has borrowed funds and the fair price is much higher than execution price', () => {
    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: new BigNumber('500'),
            base: new BigNumber('0')
        },
        trade: {
            amount: new BigNumber('10'),
            price: new BigNumber('100'),
            side: 1 // sell
        },
        feeRate: new BigNumber('0.02'),
        maxLeverage: new BigNumber('12.5'),
        fairPrice: new BigNumber('150')
    })

    assert.strictEqual(false, isValidMarginAfterTrade)
  })
})
