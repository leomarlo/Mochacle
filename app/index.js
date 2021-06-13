import {ethers} from 'ethers';
// import {uploadMochaTestToBlockchain} from './web3/contractUtilities';
import {connect, web3Modal} from './web3/web3tools'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'
import axios from 'axios'
import dotenv from 'dotenv'
// upload = require("express-fileupload"),
dotenv.config()
console.log('server ip is ',process.env.SERVERHOST_DOCKER_REMOTE)
// const agent = new https.Agent({  
//   rejectUnauthorized: false
// });  //https://github.com/axios/axios/issues/535

const ticket_div = document.getElementById("tickets-div")
const user_address = document.getElementById("user-info-address")
const user_network = document.getElementById("user-info-network")
const user_ETH_balance = document.getElementById("user-info-ETH")
const user_LINK_balance = document.getElementById("user-info-LINK")
const user_registered = document.getElementById("user-info-registered-on-mocha")
const mocha_test_file = document.getElementById("mocha-test-upload-file")
const mocha_test_file_display = document.getElementById("mocha-filename-info")
const solution_file_display = document.getElementById("solution-filename-info")
const connect_btn = document.getElementById("connect-btn")
const upload_mocha_test_btn = document.getElementById("submit-test-btn")
const pass_fraction = document.getElementById("pass-fraction-input")
const eth_reward = document.getElementById("reward-input")


const WEB3 = {PROVIDER: null}
const STRINGIFIED_FILES = {
  test: {
    meta: null,
    text: null
  },
  solution: {
    meta: null,
    text: null
  },
}

const SCORE_FACTOR = 1000

let LINK_ABI_RAW = fs.readFileSync('./contracts/interfaces/LINK.json');
let LINK_ABI = JSON.parse(LINK_ABI_RAW);
let TESTORACLE_ABI_RAW = fs.readFileSync('./contracts/interfaces/TestOracle.json');
let TESTORACLE_ABI = JSON.parse(TESTORACLE_ABI_RAW);

const CONTRACT_ADDRESS = {
  TESTORACLE: {},
  LINK: {}
}

try {
  CONTRACT_ADDRESS.TESTORACLE.rinkeby = fs.readFileSync("./contracts/addresses/TestOracle_rinkeby.txt").toString()
  CONTRACT_ADDRESS.TESTORACLE.kovan = fs.readFileSync("./contracts/addresses/TestOracle_kovan.txt").toString()
} catch {
  console.log('Could not load contract addresses')
}


mocha_test_file.addEventListener("change",handleMochaTestFile, false)
upload_mocha_test_btn.addEventListener("click", submitMochaTestUpload)
connect_btn.addEventListener("click", loginHandler);






function cidAndUidFromScriptAndAddress(script, address){
  let cid = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(script)
      .digest('hex')
  const uid_20byte = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(cid + address)
      .digest('hex')
  // cast into 16-byte unique identifyer
  const uid = uid_20byte.slice(0,32)
  return {cid, uid} 
}

async function uploadMochaTestToBlockchain(mocha_script_string, fraction, score_factor, value){

    // get content identifyer and unique id for this mocha test submission
    // console.ĺog('TestOracle_ABI')
    // web3Modal.clearCachedProvider();
    // const provider = await connect();
    let provider = WEB3.PROVIDER
    const signer = provider.getSigner(0);
    const address = await signer.getAddress();
    const {cid, uid} = cidAndUidFromScriptAndAddress(mocha_script_string, address)
    console.log('provider', provider)
    console.log('provider._network', provider._network)
    console.log('signer', signer)
    // create contract from provider
    TestOracle = new ethers.Contract(
      CONTRACT_ADDRESS.TESTORACLE[provider._network.name],
      TESTORACLE_ABI,
      signer);
    
    let return_status = ''
    try {
      const submitTest_tx = await TestOracle.submitTest(
        "0x" + uid,
        "0x" + cid,
        Math.round(fraction * score_factor),
        {value: ethers.utils.parseEther(value.toString())}
      );
      const submitTest_receipt = await submitTest_tx.wait()
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      console.log('event', submitTest_receipt_event)
      return_status += 'Successful Mocha Test submission to ' + provider._network.name + '.'
    } catch (err) {
      console.log(err)
      return_status += err.toString()
    }

    try {
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/testSubmission', {
        target_id: uid,
        submitter: address,
        name: address,
        token: address.slice(-10,),
        pass_fraction: fraction,
        targettemplatejs: mocha_script_string,
        packages_required: {}
      })
      console.log(res.data)
      return_status += '\nSuccessful Mocha Test submission to testoracle.xyz'
    } catch (err) {
      console.log(err)
      return_status += '\n' + err.toString()
    }
    return return_status
    
}



async function submitMochaTestUpload(){
  console.log('you pressed me', STRINGIFIED_FILES.test)
  // first submit to blockchain
  const fraction_in_perc = parseFloat(pass_fraction.value)
  const value = parseFloat(eth_reward.value)
  console.log('fraction_in_perc', fraction_in_perc)
  console.log('value', value)
  if (!!fraction_in_perc & !!value){
    const fraction = fraction_in_perc / 100
    const success = await uploadMochaTestToBlockchain(STRINGIFIED_FILES.test.text, fraction, SCORE_FACTOR, value)
    console.log(success)
    // then submit to testoracle.xyz
    upload_mocha_test_btn.disabled = true
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }

}




function fitsMochaCriteria(file_data){
  let pass = true
  let message = 'Your file does not satisfy basic criteria for a mocha test file!'
  if (file_data.meta.type.indexOf('javascript')<0){
    pass = false
    message += '\nIt should be a javascript file (file extension = ".js")'
  }
  const condition1 = file_data.text.indexOf('require("<<<submission>>>")')
  const condition2 = file_data.text.indexOf("require('<<<submission>>>')")
  if (!(condition1 || condition2)){
    pass = false
    message += '\nIt should require the solution functions via \'require("<<<submission>>>")\''
  }
  if (pass){
    message = 'The file passed the requirements!'
  }
  return {pass, message}
}


function handleMochaTestFile() {
  const fileList = this.files; 
  if (fileList.length>0){
    const file = fileList[0]
    fileSpecs = {
      name: file.name,
      size: file.size,
      type: file.type
    }
    mocha_test_file_display.innerText = file.name
    const reader = new FileReader();
    reader.onload = function fileReadCompleted() {
      // when the reader is done, the content is in reader.result.
      const test = {
        meta: fileSpecs,
        text: reader.result
      }
      fitnessReport = fitsMochaCriteria(test)
      if (fitnessReport.pass){
        STRINGIFIED_FILES.test = test
        upload_mocha_test_btn.disabled = false
        console.log('congratulation')
      } else {
        upload_mocha_test_btn.disabled = true
        alert(fitnessReport.message);
      }
    };
    reader.readAsText(this.files[0])

  } else {
    console.log('No file specified')
  }
}

async function loginHandler () {
  if (connect_btn.innerHTML=='Logout'){
    web3Modal.clearCachedProvider();
    WEB3.PROVIDER = null
    reset()
    connect_btn.innerHTML='Connect to Web3'
  } else {
    console.log('Connecting to web3')
    let provider = await connect();
    let signer = provider.getSigner(0);
    let address = await signer.getAddress();
    WEB3.PROVIDER = provider
    console.log('address is', address)
    const rawBalance = await provider.getBalance(address);
    const balance = Math.round(ethers.utils.formatEther(rawBalance) * 10000) / 10000;
    user_address.innerHTML = ellipse_address(address)
    user_network.innerHTML = provider._network.name
    user_ETH_balance.innerHTML = "" + balance
    user_LINK_balance.innerHTML = await getLinkBalance(address, provider, provider._network.name)

    const registration = await registerToMochaServer(address, provider._network.name)
    user_registered.innerHTML = registration["message"]
    connect_btn.innerHTML='Logout'
  }
}


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
    LINK_ABI,
    provider);
  const linkBalance = await LINKcontract.balanceOf(address);
  return ethers.utils.formatEther(linkBalance)
}

function reset(){

  user_ETH_balance.innerHTML = ""
  user_LINK_balance.innerHTML = ""
  user_network.innerHTML = ""
  user_address.innerHTML = ""
  user_registered.innerHTML = ""

}


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

function getMochaServerURL(){
  if (process.env.REMOTE==1) {
    return process.env.SERVERHOST_DOCKER_REMOTE
  } else {
    return (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
  }
}