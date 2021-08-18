require('dotenv').config()
const express = require("express")
const Web3 = require('web3');
const { omeOrderToOrder, fromWad, API_CODES } = require('@tracer-protocol/tracer-utils');
const traderABI = require('./contracts/Trader.json')
const perpetualSwapABI = require('@tracer-protocol/contracts/abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json')
const pricingABI = require('@tracer-protocol/contracts/abi/contracts/Pricing.sol/Pricing.json')
const bodyParser = require('body-parser')
const {
    validateOrder,
    validateSignature,
    validatePair,
    validateCreatedTime,
    validateExpiryTime,
    validateMarginAfterTrade,
} = require('./orderValidation')

const orderBatcher = require('./orderBatcherSingleton')
const { sendMessageToDiscord } = require('./lib')

// Create a new express app instance
const app = express();
app.use(bodyParser.json())
let web3
let traderContract;

//Routes
app.get('/', (req, res) => {
    res.status(200).send();
});

const routeWithErrorHandling = handler => async (req, res, next) => {
    try {
        await handler(req, res);
    } catch (error) {
        next(error);
    }
};

const fallbackErrorHandler = async function (error, req, res, next) {
    console.error('Caught Unhandled Error:', error.stack);
    const requestContext = JSON.stringify({
        headers: req.headers,
        protocol: req.protocol,
        url: req.url,
        method: req.method,
        body: req.body,
        cookies: req.cookies,
        ip: req.ip
    }, null, 2)
    console.error('Request:', requestContext);
    try {
        await sendMessageToDiscord(`Caught unhandled error in executioner router: ${error.stack}\n${requestContext}}`)
    } catch (discordError) {
        console.log(`failed to send discord webhook alert for unhandled router error: ${discordError.message}`)
    }
    if (process.env.NODE_ENV === 'production') {
        res.status(500).send({ message: 'Unhandled Error' });
    } else {
        res.status(500).send({ message: 'Unhandled Error', data: error.stack });
    }
};

app.use(fallbackErrorHandler)

/**
 * Endpoint used for submitting pairs of orders to the executioner. WIll process the orders
 * once the minimum number of orders (as given by the BATCH_SIZE env variable) is met.
 */
app.post('/submit', routeWithErrorHandling((req, res) => {
    //Validate orders
    const makerValidation = validateOrder(req.body.maker);

    if(!makerValidation.isValid) {
        return res.status(400).send({
            message: API_CODES.INVALID_TAKER,
            data: {
                reason: makerValidation.message,
                maker: req.body.maker
            }
        })
    }

    const takerValidation = validateOrder(req.body.taker);

    if(!takerValidation.isValid) {
        return res.status(400).send({
            message: API_CODES.INVALID_TAKER,
            data: {
                reason: takerValidation.message,
                taker: req.body.taker
            }
        })
    }

    const pairValidation = validatePair(req.body.maker, req.body.taker);
    if(!pairValidation.isValid) {
        return res.status(400).send({
            message: pairValidation.message,
            data: {
                maker: req.body.maker,
                taker: req.body.taker,
            }
        })
    }

    orderBatcher.addMatch([req.body.maker, req.body.taker])

    res.status(200).send()
}))

/**
 * Endpoint for validation of orders. Used by the OME to validate signatures before
 * passing on the orders to the book. This rejects invalid orders early to avoid
 * false liquidity on the books.
 */
app.post('/check', routeWithErrorHandling(async (req, res) => {
    if (!req.body.order) {
        return res.status(400).send({ error: "Invalid params provided" })
    }

    let network = process.env.NETWORK_ID
    let omeOrder = req.body.order;
    let contractOrder = omeOrderToOrder(web3, omeOrder)

    let signature = omeOrder.signed_data.toString()

    const isValidSig = validateSignature(contractOrder.order, process.env.TRADER_CONTRACT, network, signature)
    if(!isValidSig) {
        return res.status(400).send({
            message: API_CODES.INVALID_SIGNATURE,
            order: contractOrder.order
        });
    }

    // validate timestamps
    const isValidCreatedTime = validateCreatedTime(contractOrder.order.created)
    if(!isValidCreatedTime) {
        return res.status(400).send({
            message: API_CODES.INVALID_CREATED_TIMESTAMP,
            order: contractOrder.order
        });
    }

    const isValidExpiryTime = validateExpiryTime(contractOrder.order.expires)
    if(!isValidExpiryTime) {
        return res.status(400).send({
            message: API_CODES.INVALID_EXPIRY_TIMESTAMP,
            order: contractOrder.order
        });
    }

    // check if user has enough margin in the market
    const perpetualSwapContract = new web3.eth.Contract(perpetualSwapABI, contractOrder.order.market)

    const feeRate = await perpetualSwapContract.methods.feeRate().call()

    const trueMaxLeverage = await perpetualSwapContract.methods.trueMaxLeverage().call()

    const pricingContractAddress = await perpetualSwapContract.methods.pricingContract().call()

    const pricingContract = new web3.eth.Contract(pricingABI, pricingContractAddress)

    const fairPrice = await pricingContract.methods.fairPrice().call()

    const currentPosition = await perpetualSwapContract.methods.getBalance(contractOrder.order.maker).call()

    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: fromWad(currentPosition.position.quote),
            base: fromWad(currentPosition.position.base)
        },
        trade: {
            amount: fromWad(contractOrder.order.amount),
            price: fromWad(contractOrder.order.price),
            side: contractOrder.order.side
        },
        feeRate: fromWad(feeRate),
        maxLeverage: fromWad(trueMaxLeverage),
        fairPrice: fromWad(fairPrice)
    })

    if(!isValidMarginAfterTrade) {
        return res.status(400).send({
            message: API_CODES.UNDER_MARGIN,
            order: contractOrder.order
        })
    }

    return res.status(200).send({
        message: 'Order is valid',
        order: contractOrder.order
    })
}))

/**
 * Will return the state of the current pending orders for a given market
 */
app.get('/pending-orders/:market', routeWithErrorHandling((req, res) => {
    const pendingOrders = orderBatcher.getPendingOrdersForMarket(req.params.market)
    res.status(200).send(pendingOrders)
}))

//Start up the server
app.listen(3000, async () => {
    web3 = await new Web3(process.env.ETH_URL)
    console.log(`
        Starting executioner\n
        Connected to RPC: ${process.env.ETH_URL}\n
        Trader Address: ${process.env.TRADER_CONTRACT}\n
        GAS_LIMIT: ${process.env.GAS_LIMIT}\n
        BATCH_SIZE: ${process.env.BATCH_SIZE}\n
        NETWORK_ID: ${process.env.NETWORK_ID}\n
    `)

    //Setup signing account
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    traderContract = new web3.eth.Contract(traderABI, process.env.TRADER_CONTRACT)

    // begin processing matched orders
    const maxAttempts = process.env.MAX_ATTEMPTS ? Number(process.env.MAX_ATTEMPTS) : 2
    orderBatcher.startSubmittingMatches(traderContract, process.env.GAS_LIMIT, web3.eth.defaultAccount, maxAttempts)

    console.log("Execute order 66")
});

module.exports = app;
