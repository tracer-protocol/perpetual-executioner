let express = require("express");
let Web3 = require("web3");
let traderABI = require("./contracts/Trader.json");
let bodyParser = require("body-parser");
let validateOrder = require("./orderValidation").validateOrder;
let validateSignature = require("./orderValidation").validateSignature;
let validatePair = require("./orderValidation").validatePair;
let submitOrders = require("./orderSubmission").submitOrders;
let OrderStorage = require("./orderStorage").OrderStorage;
require("dotenv").config();

// Create a new express app instance
const app = express();
app.use(bodyParser.json());
let web3;
let traderContract;

//Orders are kept in memory and executed in batches of 100
let orderStorage = new OrderStorage();

//set last submission time
let lastSubmissionTime = new Date().getTime();

//Routes
app.get("/", (req, res) => {
    res.status(200).send();
});

/**
 * Endpoint used for submitting pairs of orders to the executioner. WIll process the orders
 * once the minimum number of orders (as given by the BATCH_SIZE env variable) is met.
 */
app.post("/submit", async (req, res) => {
    let numOrders = orderStorage.getOrderCounter();
    console.log(`Received Orders. Pending orders to process: ${numOrders}`);

    //Validate orders
    if (
        !req.body.maker ||
        !req.body.taker ||
        !validateOrder(req.body.maker) ||
        !validateOrder(req.body.taker) ||
        !validatePair(req.body.maker, req.body.taker)
    ) {
        return res.status(500).send({ error: "Invalid Orders" });
    }

    // //add the order to the order heap for this market
    orderStorage.addOrders(req.body.maker, req.body.taker);
    //repoll the number of orders
    numOrders = orderStorage.getOrderCounter();

    //If enough orders are present, process the orders on chain
    if (numOrders >= process.env.BATCH_SIZE) {
        //submit orders
        console.log(`Submitting ${numOrders} orders to contract`);
        let ordersToSubmit = orderStorage.getAllOrders();
        try {
            await submitOrders(
                ordersToSubmit[0],
                ordersToSubmit[1],
                traderContract,
                web3.eth.defaultAccount
            );
            //TODO: Handle the response from on chain, filter orders that did not match
            // so we can re add these to the book
            orderStorage.clearOrders();
            console.log(`Orders submitted and cleared`);
            lastSubmissionTime = new Date().getTime();
        } catch {
            // todo this should raise alarms if transactions aren't hitting on chain
            console.log(`Error submitting batch: `);
            console.log(ordersToSubmit);
        }
    }

    //Return
    res.status(200).send();
});

/**
 * Endpoint for submitting all orders in the executioner.
 * This can be triggered every SUBMISSION_BATCH_TIME_MS milliseconds.
 * This allows a cron job to periodically trigger the submission of orders should
 * there be some on the book
 */
app.post("/submitAll", async (req, res) => {
    numOrders = orderStorage.getOrderCounter();
    let validDate = parseInt(lastSubmissionTime) + parseInt(process.env.SUBMISSION_BATCH_MS)
    if (
        validDate <
        new Date().getTime() && numOrders > 0
    ) {
        console.log(`Submitting ${numOrders} orders to contract`);
        let ordersToSubmit = orderStorage.getAllOrders();
        try {
            await submitOrders(
                ordersToSubmit[0],
                ordersToSubmit[1],
                traderContract,
                web3.eth.defaultAccount
            );
            //TODO: Handle the response from on chain, filter orders that did not match
            // so we can re add these to the book
            orderStorage.clearOrders();
            console.log(`Orders submitted and cleared`);
            lastSubmissionTime = new Date().getTime();
        } catch {
            // todo this should raise alarms if transactions aren't hitting on chain
            console.log(`Error submitting batch: `);
            console.log(ordersToSubmit);
        }
        res.status(200).send({ result: "OK"})
    } else {
        res.status(200).send({ result: "Cannot submit all orders"})
    }
});

/**
 * Endpoint for validation of orders. Used by the OME to validate signatures before
 * passing on the orders to the book. This rejects invalid orders early to avoid
 * false liquidity on the books.
 */
app.post("/check", async (req, res) => {
    if (
        !req.body.order ||
        !req.body.trader ||
        !req.body.network ||
        !req.body.sig
    ) {
        console.log("missing params");
        return res.status(400).send({ error: "Invalid params provided" });
    }
    let isValidSig = validateSignature(
        req.body.order,
        req.body.trader,
        req.body.network,
        req.body.sig
    );
    console.log(isValidSig);
    return res.status(200).send({ verified: isValidSig });
});

/**
 * Will return the state of the current pending orders for a given market
 */
app.get("/pending-orders", (req, res) => {
    if (!req.params.market) {
        res.status(500);
    } else {
        let orders = orderStorage.getAllOrders();
        res.status(200).send({
            makeOrders: orders[0],
            takeOrders: orders[1],
            count: orders[2],
        });
    }
});

//Start up the server
app.listen(3000, async () => {
    web3 = await new Web3(process.env.ETH_URL);
    console.log(`Connected to RPC ${process.env.ETH_URL}`);
    //Setup signing account
    const account = web3.eth.accounts.privateKeyToAccount(
        process.env.PRIVATE_KEY
    );
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    traderContract = new web3.eth.Contract(
        traderABI,
        process.env.TRADER_CONTRACT
    );
    console.log("Execute order 66");
});

module.exports = app;
