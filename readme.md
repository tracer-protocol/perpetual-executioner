# Executioner
The executioner is a microservice made for executing batches of signed ordres to an on chain contract. It works in tandem with some form of order matching engine.

## Setup
Install dependencies: `yarn install`

Create a .env file with the following structure
```
TRADER_CONTRACT = ADDRESS OF DEPLOYED TRADER CONTRACT
ETH_URL = ETH RPC URL (for ganache = http://localhost:8545)
PRIVATE_KEY = PRIVATE KEY OF ACCOUNT TO TRANSMIT BATCHES
BATCH_SIZE = SIZE OF BATCHES TO PROCESS (OPTIMAL = 100)
GAS_LIMIT = GAS LIMIT TO SEND WITH EACH BACH
SUBMISSION_BATCH_MS = TIME BEFORE A BATCH CAN BE MANUALLY TRIGGERED
NETWORK_ID = ETH NETWORK ID
WHITELIST = CSV STRING OF WHITELISTED ADDRESSES
```
If using a local ETH RPC, start that up, or use `yarn ganache` to start up the packaged ganache-cli.

Start the server: `yarn start`

### Running Locally with Docker
If you wish to run the service locally with Docker, run the following commands
`docker build . -t executioner`
then start the docker image using
`docker run --env-file=.env executioner`


## Usage
The executioner is waiting for matched orders on the `/submit` route. It expects orders of the form

```
{
    "maker": {
        "id":"0x80e800669d88b5e83c939658a6c201eb7afbea4e73c400f50e650a9212f3d6a7",
        "address":"0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
        "market":"0x529da3408a37a91c8154c64f3628db4eaa7b8da2",
        "side":"Ask",
        "price":12,
        "amount":33,
        "expiration":1596600983,
        "flags":{"bits":1},
        "signed_data":[12,33,88,43,42,22],
    },
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
    }
}
```

## Testing
Start ganache-cli using `yarn ganache`. In a new terminal window run `yarn test`.

## Deployment
To deploy changes to GCP, use the following. Note the env file for the image lives in GCP itself and edits to it should be made there. Reach out to @raymogg for help on this.
### Build and tag the image
`docker build . -t gcr.io/tracer-protocol-testing/executioner`

### Push to GCR
The executioner can easily be deployed to GCP by running the following.
`docker push gcr.io/tracer-protocol-testing/executioner`

