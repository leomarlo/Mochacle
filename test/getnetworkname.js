// get network name
const ethers = require('ethers');
// const {changePassword, registerNewUser} = require("../utilities/users.js");
require('dotenv').config()

let provider_url = 'https://rinkeby.infura.io/v3/5718340b942f4fc1a524b21ca5acbc92'

console.log('provider_url', provider_url)
const provider = new ethers.providers.JsonRpcProvider(provider_url);

console.log('provider',provider)

const wallet_alice = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);

console.log('wallet_alice', wallet_alice)
