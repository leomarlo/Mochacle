import {ethers} from 'ethers';
import providerOptions from './web3/providerOptions';
import web3tools from './web3/web3tools'
import fs from 'fs'
import https from 'https'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()
console.log('server ip',process.env.SERVERHOST_DOCKER_REMOTE)
// const agent = new https.Agent({  
//   rejectUnauthorized: false
// });  //https://github.com/axios/axios/issues/535

const ticket_div = document.getElementById("tickets-div")
const user_address = document.getElementById("user-info-address")
const user_network = document.getElementById("user-info-network")
const user_ETH_balance = document.getElementById("user-info-ETH")
const user_LINK_balance = document.getElementById("user-info-LINK")
const user_registered = document.getElementById("user-info-registered-on-mocha")

const connect_btn = document.getElementById("connect-btn")


connect_btn.addEventListener("click", async () => {
  if (connect_btn.innerHTML=='Logout'){
    web3tools.web3Modal.clearCachedProvider();
    reset()
    connect_btn.innerHTML='Connect to Web3'
  } else {
    const provider = await web3tools.connect();
    const signer = await provider.getSigner(0);
    const address = await signer.getAddress();
    const rawBalance = await provider.getBalance(address);
    const balance = Math.round(ethers.utils.formatEther(rawBalance) * 10000) / 10000;
    user_address.innerHTML = ellipse_address(address)
    user_network.innerHTML = provider.network.name
    user_ETH_balance.innerHTML = "" + balance
    user_LINK_balance.innerHTML = await getLinkBalance(address, provider, provider.network.name)

    const registration = await registerToMochaServer(address, provider.network.name)
    user_registered.innerHTML = registration["message"]
    connect_btn.innerHTML='Logout'
  }
});


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
  let LINK_ABI_RAW = fs.readFileSync('./app/contractInterfaces/LINK.json');
  const LINKcontract = new ethers.Contract(
    LINK_ADDRESS,
    JSON.parse(LINK_ABI_RAW),
    provider);
  const linkBalance = await LINKcontract.balanceOf(address);
  return ethers.utils.formatEther(linkBalance)
}

function reset(){

  user_ETH_balance.innerHTML = ""
  user_LINK_balance.innerHTML = ""
  user_network.innerHTML = ""
  user_address.innerHTML = ""

}

// const instance = axios.create({
//   httpsAgent: new https.Agent({  
//     rejectUnauthorized: false
//   })
// });

async function registerToMochaServer(address, network){
  let MOCHA_SERVER_URL = getMochaServerURL()
  try {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';
    const response = await axios.post(MOCHA_SERVER_URL + '/registerNewUser', {
      token: address.slice(-10,),
      address: address,
      networks: [network, 'kovan', 'rinkeby'],
    })
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
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

function getMochaServerURL(){
  if (process.env.REMOTE==1) {
    return process.env.SERVERHOST_DOCKER_REMOTE
  } else {
    return (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
  }
}