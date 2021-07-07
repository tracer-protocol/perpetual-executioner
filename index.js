require('dotenv').config()
let express = require("express")
let Web3 = require('web3');
const accounting = require('@tracer-protocol/tracer-utils')
let traderABI = require('./contracts/Trader.json')
let perpetualSwapABI = require('@tracer-protocol/contracts/abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json')
let bodyParser = require('body-parser')
let validateOrder = require("./orderValidation").validateOrder
let validateSignature = require("./orderValidation").validateSignature
let validatePair = require("./orderValidation").validatePair
let validateWhitelist = require("./orderValidation").validateWhitelist
let validateCreatedTime = require("./orderValidation").validateCreatedTime
let validateExpiryTime = require("./orderValidation").validateExpiryTime
let validateMarginAfterTrade = require("./orderValidation").validateMarginAfterTrade

let submitOrders = require("./orderSubmission").submitOrders
let OrderStorage = require("./orderStorage").OrderStorage
let omeOrderToOrder = require("@tracer-protocol/tracer-utils").omeOrderToOrder;
const { default: BigNumber } = require('bignumber.js');

// Create a new express app instance
const app = express();
app.use(bodyParser.json())
let web3
let traderContract;

//Orders are kept in memory and executed in batches of 100
let orderStorage = new OrderStorage()

//Routes
app.get('/', (req, res) => {
    res.status(200).send();
});

/**
 * Endpoint used for submitting pairs of orders to the executioner. WIll process the orders
 * once the minimum number of orders (as given by the BATCH_SIZE env variable) is met.
 */
app.post('/submit', async (req, res) => {
    let numOrders = orderStorage.getOrderCounter(req.body.maker.target_tracer)
    console.log(`Received Orders. Pending orders to process: ${numOrders}`)
    //Validate orders
    if (!req.body.maker || !req.body.taker ||
        (!validateOrder(req.body.maker) || !validateOrder(req.body.taker) ||
            !validatePair(req.body.maker, req.body.taker))) {
        return res.status(500).send({ error: "Invalid Orders" })
    }

    // //add the order to the order heap for this market
    orderStorage.addOrders(req.body.maker, req.body.taker, req.body.maker.target_tracer)
    //repoll the number of orders
    numOrders = orderStorage.getOrderCounter(req.body.maker.target_tracer)

    //If enough orders are present, process the orders on chain
    if (numOrders >= process.env.BATCH_SIZE) {
        //submit orders
        console.log(`Submitting ${numOrders} orders to contract`)
        let ordersToSubmit = orderStorage.getAllOrders(req.body.maker.target_tracer)
        try {
            await submitOrders(ordersToSubmit[0], ordersToSubmit[1], traderContract, process.env.GAS_LIMIT, web3.eth.defaultAccount)
            //TODO: Decide on error handling for if submitOrders does not process for some reason.
            //clear order storage for this market
            orderStorage.clearMarket(req.body.maker.target_tracer)
            console.log(`Orders submitted and cleared`)
        } catch {
            console.log(`Error submitting batch: `)
            console.log(ordersToSubmit)
        }
    }

    //Return
    res.status(200).send()
})

/**
 * Endpoint for validation of orders. Used by the OME to validate signatures before
 * passing on the orders to the book. This rejects invalid orders early to avoid
 * false liquidity on the books.
 */
app.post('/check', async (req, res) => {
    if (!req.body.order) {
        console.log("missing order")
        return res.status(400).send({ error: "Invalid params provided" })
    }

    let network = process.env.NETWORK_ID
    let omeOrder = req.body.order;
    let contractOrder = omeOrderToOrder(web3, omeOrder)

    let signature = omeOrder.signed_data.toString()

    const isValidSig = validateSignature(contractOrder.order, process.env.TRADER_CONTRACT, network, signature)
    if(!isValidSig) {
        return res.status(400).send({
            message: 'Invalid signature, ensure the correct Trading Contract is being used',
            order: contractOrder.order
        });
    }

    const isWhitelisted = validateWhitelist(web3, contractOrder.order.maker)
    if(!isWhitelisted) {
        return res.status(400).send({
            message: 'Address not whitelisted for trading',
            order: contractOrder.order
        });
    }

    // validate timestamps
    const isValidCreatedTime = validateCreatedTime(contractOrder.order.created)
    if(!isValidCreatedTime) {
        return res.status(400).send({
            message: 'Order created time is invalid',
            order: contractOrder.order
        });
    }

    const isValidExpiryTime = validateExpiryTime(contractOrder.order.expires)
    if(!isValidExpiryTime) {
        return res.status(400).send({
            message: 'Order expiry time is invalid',
            order: contractOrder.order
        });
    }

    // check if user has enough margin in the market
    const perpetualSwapContract = new web3.eth.Contract(perpetualSwapABI, contractOrder.order.market)

    const feeRate = await perpetualSwapContract.methods.feeRate().call()
    const trueMaxLeverage = await perpetualSwapContract.methods.trueMaxLeverage().call()

    const currentPosition = await perpetualSwapContract.methods.getBalance(contractOrder.order.maker).call()

    const isValidMarginAfterTrade = validateMarginAfterTrade({
        currentPosition: {
            quote: accounting.fromWad(currentPosition.position.quote),
            base: accounting.fromWad(currentPosition.position.base)
        },
        trade: {
            amount: accounting.fromWad(contractOrder.order.amount),
            price: accounting.fromWad(contractOrder.order.price),
            side: contractOrder.order.side
        },
        feeRate: accounting.fromWad(feeRate),
        maxLeverage: accounting.fromWad(trueMaxLeverage)
    })

    if(!isValidMarginAfterTrade) {
        return res.status(400).send({
            message: 'Account does not have enough margin to perform trade',
            order: contractOrder.order
        })
    }

    return res.status(200).send({
        message: 'Order is valid',
        order: contractOrder.order
    })
})

/**
 * Will return the state of the current pending orders for a given market
 */
app.get('/pending-orders/:market', (req, res) => {
    if (!req.params.market) {
        res.status(500)
    } else {
        let orders = orderStorage.getAllOrders(req.params.market)
        if (orders === null) {
            res.status(200).send({
                "makeOrders": [],
                "takeOrders": [],
                "count": 0
            })
        } else {
            res.status(200).send({
                "makeOrders": orders[0],
                "takeOrders": orders[1],
                "count": orders[2]
            })
        }
    }
})

//Start up the server
app.listen(3000, async () => {
    web3 = await new Web3(process.env.ETH_URL)
    console.log(`Connected to RPC ${process.env.ETH_URL}`)
    //Setup signing account
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    traderContract = new web3.eth.Contract(traderABI, process.env.TRADER_CONTRACT)
    console.log("Execute order 66")
});

module.exports = app;
