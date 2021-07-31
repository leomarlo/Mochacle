import {ethers} from 'ethers';
// import {uploadMochaTestToBlockchain} from './web3/contractUtilities';
import {connect, web3Modal} from './web3/web3tools'
import {rewardSolutionHandler} from './utilities/contract'
import {displayMySolutionIds, displayMochaTest} from './utilities/display'
import {testFile, solutionFile} from './utilities/files'  // TODO; not needed
import {handleMochaTestFile, handleMochaSolutionFile} from './utilities/fileupload'
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
const mocha_target_input = document.getElementById("test-script-id-input")
const solution_reward_input = document.getElementById("solution-id-input")
const user_address = document.getElementById("user-info-address")
const user_network = document.getElementById("user-info-network")
const user_ETH_balance = document.getElementById("user-info-ETH")
const user_LINK_balance = document.getElementById("user-info-LINK")
const user_registered = document.getElementById("user-info-registered-on-mocha")



const contract_address = document.getElementById("contract-info-address")
const contract_network = document.getElementById("contract-info-network")
const contract_ETH_balance = document.getElementById("contract-info-ETH")
const contract_LINK_balance = document.getElementById("contract-info-LINK")


const mocha_test_file = document.getElementById("mocha-test-upload-file")
const mocha_test_file_display = document.getElementById("mocha-filename-info")
const mocha_solution_file = document.getElementById("mocha-solution-upload-file")
const mocha_solution_file_display = document.getElementById("solution-filename-info")
const connect_btn = document.getElementById("connect-btn")
const upload_mocha_test_btn = document.getElementById("submit-test-btn")
const upload_mocha_solution_btn = document.getElementById("submit-solution-btn")
const reward_solution_btn = document.getElementById("submit-reward-btn")

const pass_fraction = document.getElementById("pass-fraction-input")
const eth_reward = document.getElementById("reward-input")


const clear_display_btn = document.getElementById("clear-display-btn")

const WEB3 = {PROVIDER: null}


const SCORE_FACTOR = 1000

let LINK_ABI_RAW = fs.readFileSync('./contracts/interfaces/LINK.json');
let LINK_ABI = JSON.parse(LINK_ABI_RAW);
let MOCHACLE_ABI_RAW = fs.readFileSync('./contracts/interfaces/Mochacle.json');
let MOCHACLE_ABI = JSON.parse(MOCHACLE_ABI_RAW);


const ABIS = {
  LINK_ABI,
  MOCHACLE_ABI
}

const CONTRACT_ADDRESS = {
  MOCHACLE: {},
  LINK: {}
}

try {
  CONTRACT_ADDRESS.MOCHACLE.rinkeby = fs.readFileSync("./contracts/addresses/Mochacle_rinkeby.txt").toString()
  CONTRACT_ADDRESS.MOCHACLE.kovan = fs.readFileSync("./contracts/addresses/Mochacle_kovan.txt").toString()
} catch {
  console.log('Could not load contract addresses')
}


connect_btn.addEventListener("click", loginHandler);
mocha_test_file.addEventListener("change",testUpload)
mocha_solution_file.addEventListener("change",solutionUpload)
upload_mocha_test_btn.addEventListener("click", submitMochaTestUpload)
upload_mocha_solution_btn.addEventListener("click", submitMochaSolutionUpload)

mocha_target_input.addEventListener("click", mochaTestDisplayHandler)
solution_reward_input.addEventListener("click", solutionDisplayHandler)
reward_solution_btn.addEventListener("click", ()=>{
  const provider = WEB3.PROVIDER
  rewardSolutionHandler(
          provider,
          solution_reward_input.value,
          CONTRACT_ADDRESS.MOCHACLE[provider._network.name],
          ABIS.MOCHACLE_ABI)
})

function testUpload() {
  const fileList = this.files;
  handleMochaTestFile(fileList,
                      mocha_test_file_display,
                      upload_mocha_test_btn)
}

function solutionUpload(){
  const fileList = this.files; 
  handleMochaSolutionFile(fileList,
                          mocha_solution_file_display,
                          upload_mocha_solution_btn,
                          mocha_target_input)

}

function addAllEventListenersAgain(){

  mocha_target_input.addEventListener("click", mochaTestDisplayHandler)
  solution_reward_input.addEventListener("click", solutionDisplayHandler)
}

function cidAndUidFromScriptAndAddress(script, address, chainid){
  let cid = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(script)
      .digest('hex')
  const uid_20byte = crypto
      .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
      .update(cid + address + chainid)
      .digest('hex')
  // cast into 16-byte unique identifyer
  const uid = uid_20byte.slice(0,32)
  return {cid, uid} 
}

async function uploadMochaTestToBlockchainAndServer(mocha_script_string, fraction, value){

    // get content identifyer and unique id for this mocha test submission
    // console.ĺog('TestOracle_ABI')
    // web3Modal.clearCachedProvider();
    // const provider = await connect();
    let provider = WEB3.PROVIDER
    const signer = provider.getSigner(0);
    const address = await signer.getAddress();
    const {cid, uid} = cidAndUidFromScriptAndAddress(mocha_script_string, address, provider._network.chainId)
    console.log('provider', provider)
    console.log('provider._network', provider._network)
    console.log('signer', signer)
    // create contract from provider
    TestOracle = new ethers.Contract(
      CONTRACT_ADDRESS.MOCHACLE[provider._network.name],
      ABIS.MOCHACLE_ABI,
      signer);
    
    let return_status = ''
    let transaction_hash = ''
    let transaction_url = ''
    try {
      const score_factor_pre_format = await TestOracle.SCORE_FACTOR();
      const score_factor = Math.floor(ethers.utils.formatUnits(score_factor_pre_format, 0))
    
      const submitTest_tx = await TestOracle.submitTest(
        "0x" + uid,
        "0x" + cid,
        Math.round(fraction * score_factor),
        {value: ethers.utils.parseEther(value.toString())}
      );
      
      const submitTest_receipt = await submitTest_tx.wait()
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      transaction_hash = submitTest_receipt.transactionHash
      transaction_url = 'https://' + provider._network.name + '.etherscan.io/tx/' + submitTest_receipt.transactionHash
        
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
        chain_name: provider._network.name,
        chain_id: provider._network.chainId,
        pass_fraction: fraction,
        targettemplatejs: mocha_script_string,
        packages_required: {},
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      })

      console.log(res.data)
      return_status += '\nSuccessful Mocha Test submission to testoracle.xyz'
    } catch (err) {
      console.log(err)
      return_status += '\n' + err.toString()
    }
    return return_status
    
}


async function submitMochaSolutionUpload() {
  console.log('you pressed me ... solution upload:', solutionFile)
  // check whether this input exists
  const exist_flag = await MochaTargetExists(mocha_target_input.value) 
  // console.log(mocha_target_input.value)
  // console.log(exist_flag)

  if (exist_flag){
    const success_contract_upload = await uploadMochaSolutionToBlockchainAndServer(mocha_target_input.value, solutionFile.text)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    upload_mocha_solution_btn.disabled = true
    // re-allow event-listener 
    // TODO: not the right place here
    addAllEventListenersAgain()

    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }
}





async function uploadMochaSolutionToBlockchainAndServer(target_id, solution_script) {
  // console.log()

  let provider = WEB3.PROVIDER
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  const {cid, uid} = cidAndUidFromScriptAndAddress(solution_script, address, provider._network.chainId)
  
  TestOracle = new ethers.Contract(
    CONTRACT_ADDRESS.MOCHACLE[provider._network.name],
    ABIS.MOCHACLE_ABI,
    signer);
  
  let return_status = ''
  let transaction_hash = ''
  let transaction_url = ''
  let success_flag = true

  try {
    const submitSolution_tx = await TestOracle.submitSolution(
      '0x' + target_id,
      '0x' + uid,
      '0x' + cid,
      {gasLimit: 4000000})
    const submitSolution_receipt = await submitSolution_tx.wait();
    transaction_hash = submitSolution_receipt.transactionHash
    transaction_url = 'https://' + provider._network.name + '.etherscan.io/tx/' + submitSolution_receipt.transactionHash
      
    return_status += 'Successful Mocha Solution submission to ' + provider._network.name + '.'

  } catch (err) {
    success_flag = false
    return_status += err.toString()
  }

  if (success_flag){
    try {
      const packages_required = {}
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/solutionSubmission', {
        submission_id: uid,
        target_id: target_id,
        submitter: address,
        name: address,
        token: address.slice(-10,),
        chain_name: provider._network.name,
        chain_id: provider._network.chainId,
        submissionjs: solution_script,
        packages_required: packages_required,
        transaction_hash: transaction_hash,
        transaction_url: transaction_url
      })
      console.log(res.data)
      // return res.data

      return_status += "successful submission to the remote server!"
      console.log(return_status)
    } catch (err) {
      return_status += err.toString()
      success_flag = false
    }
  }

  // run the script
  if (success_flag){
    try {
      const res = await axios.post(process.env.SERVERHOST_DOCKER_REMOTE + '/runSubmission', {
            submission_id: uid,
            name: address,
            token: address.slice(-10,)
        })
      console.log(res.data)
      return_status += "successful ran the submission, too!"
      console.log(return_status)
    } catch(e) {
      return_status += err.toString()
      success_flag = false
    }
  }
  
  
  return return_status
}


async function MochaTargetExists(target_id) {
  // should check whether the id exists. So it should be a call to the smart contract
  if (target_id.length>0){
    return true
  }
  return false
}


async function submitMochaTestUpload(){
  console.log('you pressed me', testFile)
  // first submit to blockchain
  const fraction_in_perc = parseFloat(pass_fraction.value)
  const value = parseFloat(eth_reward.value)
  console.log('fraction_in_perc', fraction_in_perc)
  console.log('value', value)
  if (!!fraction_in_perc & !!value){
    const fraction = fraction_in_perc / 100
    const success_contract_upload = await uploadMochaTestToBlockchainAndServer(testFile.text, fraction, value)
    console.log(success_contract_upload)
    // then submit to testoracle.xyz
    upload_mocha_test_btn.disabled = true
    
  } else {
    console.log('couldnt submit the test script to the blockchain')
  }

}


async function solutionDisplayHandler(){

  console.log('inside solutionDisplayHandler')
  solution_reward_input.style.cursor = 'text'
  solution_reward_input.placeholder = 'Select solution id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  const provider = WEB3.PROVIDER
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  displayMySolutionIds(address, 
                       ticket_div,
                       solution_reward_input)
  // remove event listener
  solution_reward_input.removeEventListener("click", solutionDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}


async function mochaTestDisplayHandler(){
  console.log('inside event listener')
  // first change the cursor style to text
  mocha_target_input.style.cursor = 'text'
  mocha_target_input.placeholder = 'Select mocha script id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  displayMochaTest(ticket_div,
                   mocha_target_input,
                   mocha_solution_file_display)
  // remove event listener
  mocha_target_input.removeEventListener("click", mochaTestDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}




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
    WEB3.PROVIDER = provider
    console.log('address is', address)
    const rawBalance = await provider.getBalance(address);
    const balance = Math.round(ethers.utils.formatEther(rawBalance) * 10000) / 10000;

    // update user information
    user_address.innerHTML = ellipse_address(address)
    user_network.innerHTML = provider._network.name
    user_ETH_balance.innerHTML = "" + balance
    user_LINK_balance.innerHTML = await getLinkBalance(address, provider, provider._network.name)

    // update contract information
    // let contract_file_name = './contracts/addresses/Mochacle_' + provider._network.name + '.txt'
    // console.log(contract_file_name)
    // contr_address = fs.readFileSync(contract_file_name).toString()
      
    // try {
    //   contract_address.innerHTML = ellipse_address(contr_address)
    //   const contractrawBalance = await provider.getBalance(contr_address);
    //   const contractbalance = Math.round(ethers.utils.formatEther(contractrawBalance) * 10000) / 10000;
    //   contract_ETH_balance.innerHTML = "" + contractbalance
    //   contract_LINK_balance.innerHTML = user_LINK_balance.innerHTML = await getLinkBalance(contr_address, provider, provider._network.name)
    //   contract_network.innerHTML = provider._network.name
    // } catch (err) {
    //   console.log(err)
    //   contract_address.innerHTML = 'not known'
    //   contract_network.innerHTML = provider._network.name
    //   contract_ETH_balance.innerHTML = "not known"
    //   contract_LINK_balance.innerHTML = 'not known'
    // }
    


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
    ABIS.LINK_ABI,
    provider);
  const linkBalance = await LINKcontract.balanceOf(address);
  return ethers.utils.formatEther(linkBalance)
}

function reset(){
  WEB3.PROVIDER = null
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