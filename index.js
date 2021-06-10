let express = require("express")
let Web3 = require('web3');
let traderABI = require('./contracts/Trader.json')
let bodyParser = require('body-parser')
let validateOrder = require("./orderValidation").validateOrder
let validateSignature = require("./orderValidation").validateSignature
let validatePair = require("./orderValidation").validatePair
let submitOrders = require("./orderSubmission").submitOrders
let OrderStorage = require("./orderStorage").OrderStorage
let omeOrderToOrder = require("@tracer-protocol/tracer-utils").omeOrderToOrder
require('dotenv').config()

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
            await submitOrders(ordersToSubmit[0], ordersToSubmit[1], traderContract, web3.eth.defaultAccount)
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

    let signature = web3.utils.bytesToHex(omeOrder.signed_data)

    let isValidSig = validateSignature(contractOrder.order, process.env.TRADER_CONTRACT, network, signature)
    console.log(isValidSig)
    return res.status(200).send({ verified: isValidSig })
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
