let express = require("express")
let Web3 = require('web3');
let trader = require('./contracts/Trader.json')
let bodyParser = require('body-parser')
let validateOrder = require("./orderValidation").validateOrder
let validatePair = require("./orderValidation").validatePair
let submitOrders = require("./orderSubmission").submitOrders
let OrderStorage = require("./orderStorage").OrderStorage
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

app.post('/submit', async (req, res) => {
    console.log("Received orders")

    //Validate orders
    if (!req.body.maker || !req.body.taker ||
        (!validateOrder(req.body.maker) || !validateOrder(req.body.taker) ||
            !validatePair(req.body.maker, req.body.taker))) {
        console.log("Invalid orders")
        console.log(req.body)
        console.log(req.body.maker)
        return res.status(500).send({ error: "Invalid Orders" })
    }
    console.log("Orders validated")

    //add the order
    orderStorage.addOrders(req.body.maker, req.body.taker, req.body.maker.market)

    if (orderStorage.getOrderCounter(req.body.maker.market) >= 100) {
        //submit orders
        console.log(`Submitting ${orderCounter} orders to contract`)
        let ordersToSubmit = orderStorage.getAllOrders(req.body.maker.market)
        await submitOrders(ordersToSubmit[0], ordersToSubmit[1], traderContract, req.body.maker.market)
        //clear order storage
        orderStorage.clearMarket(req.body.maker.market)
    } else {
        console.log(`Pending orders: ${orderStorage.getOrderCounter(req.body.maker.market)}`)
    }
    
    console.log("Complete")

    res.status(200).send()
})

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

//Setup
app.listen(3000, async () => {
    web3 = await new Web3(process.env.ETH_URL)
    //Setup signing account
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    let contractABI = trader.abi
    traderContract = new web3.eth.Contract(contractABI, process.env.TRADER_CONTRACT)
    console.log("Executer has begun. Lets kill some orders")
});

module.exports = app;