const web3 = require("web3")
/**
 * INPUT
    "taker": {
        "id":"0xc500c7063a6a2abbf651a355c9ef9888ed217de2ba7b1538603331e7e3009161",
        "address":"0x529da3408a37a91c8154c64f3628db4eaa7b8da2"
        ,"market":"0x529da3408a37a91c8154c64f3628db4eaa7b8da2"
        ,"side":"Bid"
        ,"price":12,
        "amount":0,
        "expiration":1596600983,
        "flags":{"bits":1},
        "signed_data":[12,33,88,43,42,22],
        "nonce":"0x44"
    }

    OUTPUTS
    LIMIT ORDER
        uint256 amount;
        int256 price;
        bool side;
        address user;
        uint256 expiration;
        address targetTracer;
        uint256 nonce;
    SIGR bytes32
    SIGS bytes32
    SIGV uint8
 */
const serialiseOrder = (rawOrder) => {
    let serialisedOrder = {}
    serialisedOrder.limitOrder = {
        amount: rawOrder.amount,
        price: rawOrder.price,
        side: rawOrder.amount === "Bid",
        user: rawOrder.address,
        expiration: rawOrder.expiration,
        targetTracer: rawOrder.market,
        nonce: nonce
    }

    //Parse sigR, sigS, sigV as per EIP712
    let sigAsByteString = web3.utils.bytesToHex(rawOrder.signed_data)
    serialisedOrder.sigR = "0x" + sigAsByteString.substring(0, 64)
    serialisedOrder.sigS = "0x" + sigAsByteString.substring(64, 128)
    serialisedOrder.sigV = parseInt(sigAsByteString.substring(128, 130), 16)
    return serialisedOrder
}