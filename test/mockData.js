let Web3 = require('web3');

let web3 = new Web3(process.env.ETH_URL)
//EIP712 Signature Example
let exampleSignatureRaw = "0x790638318b21ec73c6ac6cf5596d32bfe63928bd2fe6793e969c300e6039507235ff44e018faec98c43ec61d1919242dd11979a4692cb162571df703135e18fc1b"

const sampleBid = {
  "id": 0,
  "user": "0x529da3408a37a91c8154c64f3628db4eaa7b8da3",
  "target_tracer": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
  "side": "Bid",
  "price": 12,
  "amount": 5,
  "expiration": parseInt(Date.now() / 1000) + 1000,
  "created": parseInt(Date.now() / 1000),
  "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

const sampleAsk = {
  "id": 0,
  "user": "0x529da3408a37a91c8154c64f3628db4eaa7b8da3",
  "target_tracer": "0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
  "side": "Ask",
  "price": 12,
  "amount": 5,
  "expiration": parseInt(Date.now() / 1000) + 1000,
  "created": parseInt(Date.now() / 1000),
  "signed_data": web3.utils.hexToBytes(exampleSignatureRaw),
}

module.exports = {
  sampleBid,
  sampleAsk
}