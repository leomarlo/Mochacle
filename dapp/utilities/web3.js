import Web3Modal from "web3modal";
import {ethers} from 'ethers';
import axios from 'axios'

// user information display
const user_address = document.getElementById("user-info-address")
const user_network = document.getElementById("user-info-network")
const user_ETH_balance = document.getElementById("user-info-ETH")
const user_LINK_balance = document.getElementById("user-info-LINK")
const user_registered = document.getElementById("user-info-registered-on-mocha")
const connect_btn = document.getElementById("connect-btn")

// contract information display
const contract_address = document.getElementById("contract-info-address")
const contract_network = document.getElementById("contract-info-network")
const contract_ETH_balance = document.getElementById("contract-info-ETH")
const contract_LINK_balance = document.getElementById("contract-info-LINK")


/*
* Initialize contract addresses of the mochacle and link for rinkeby and kovan.
* Initialize the contract ABIs for mochacle.sol and link.sol 
* Initialize the provider object
*/
const CONTRACT_ADDRESS = {
  MOCHACLE: {
    rinkeby: '',
    kovan: ''
  },
  LINK: {
    rinkeby: '',
    kovan: ''
  }
}

const ABIS = {
  MOCHACLE_ABI: '',
  LINK_ABI: ''
}

const PROVIDER = {
  INDUCED: null 
}

const providerOptions = {};

const web3Modal = new Web3Modal({
  network: "mainnet",
  cacheProvider: true,
  providerOptions
});

// connect to a web3 external provider
async function connect() {
  const externalProvider = await web3Modal.connect();
  return new ethers.providers.Web3Provider(externalProvider);
}


// long addresses are hidden in points (e.g. aD43f...553a)
function ellipse_address(name){
  const L = name.length
  const k = 4
  if (L>(2*k + 2)){
    return name.slice(0,2+k) + '...' + name.slice(-4,)
  }
  return name
}

async function getLinkBalance(address, provider, network){
  let LINK_ADDRESS = ''
  if (network=='kovan'){
    LINK_ADDRESS = process.env.LINK_CONTRACT_KOVAN
  } else if (network=='rinkeby'){
    LINK_ADDRESS = process.env.LINK_CONTRACT_RINKEBY
  } else {
    return ''
  }

  const LINKcontract = new ethers.Contract(
    LINK_ADDRESS,
    ABIS.LINK_ABI,
    provider);
  const linkBalance = await LINKcontract.balanceOf(address);
  return ethers.utils.formatEther(linkBalance)
}


// clear all the user information entries 
// (when contract information is added, those should also be cleared)
function reset(){
  PROVIDER.INDUCED = null
  user_ETH_balance.innerHTML = ""
  user_LINK_balance.innerHTML = ""
  user_network.innerHTML = ""
  user_address.innerHTML = ""
  user_registered.innerHTML = ""

}

// register the address to the mochaserver
async function registerToMochaServer(address, network){
  let MOCHA_SERVER_URL = getMochaServerURL()
  try {
    // process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';
    const response = await axios.post(MOCHA_SERVER_URL + '/registerNewUser', {
      token: address.slice(-10,),
      address: address,
      networks: [network, 'kovan', 'rinkeby'],
    })
    // process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
    return {
      "message": response.data,
      "error": false
    }
  } catch (e) {
    return {
      "message": e,
      "error": true
    }
  }
}

// get the url of the mocha remote server
function getMochaServerURL(){
  if (process.env.REMOTE==1) {
    return process.env.SERVERHOST_DOCKER_REMOTE
  } else {
    return (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
  }
}


// when clicked an odd number of times, it logs the user into the web3 provider
// otherwise it logs the user out.
async function loginHandler () {
  if (connect_btn.innerHTML=='Logout'){
    web3Modal.clearCachedProvider();
    reset()
    connect_btn.innerHTML='Connect to Web3'
  } else {
    console.log('Connecting to web3')
    let provider = await connect();
    let signer = provider.getSigner(0);
    let address = await signer.getAddress();
    PROVIDER.INDUCED = provider
    console.log('address is', address)
    const rawBalance = await provider.getBalance(address);
    const balance = Math.round(ethers.utils.formatEther(rawBalance) * 10000) / 10000;

    // update user information
    user_address.innerHTML = address
    user_network.innerHTML = provider._network.name
    user_ETH_balance.innerHTML = "" + balance
    user_LINK_balance.innerHTML = await getLinkBalance(address, provider, provider._network.name)


    const registration = await registerToMochaServer(address, provider._network.name)
    user_registered.innerHTML = registration["message"]
    connect_btn.innerHTML='Logout'
  }
}

module.exports = {
    reset,
    getLinkBalance,
    loginHandler,
    PROVIDER,
    CONTRACT_ADDRESS,
    ABIS,
}