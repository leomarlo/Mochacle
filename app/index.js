import {ethers} from 'ethers';
import {PROVIDER, ABIS, CONTRACT_ADDRESS, loginHandler} from './utilities/web3'
import {rewardSolutionHandler, submitMochaTestUpload, submitMochaSolutionUpload} from './utilities/contract'
import {displayMochaTest, displayMySolutionIds} from './utilities/display'
import {handleMochaTestFile, handleMochaSolutionFile} from './utilities/fileupload'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'
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

const show_tests_btn = document.getElementById("show-tests-btn")
const show_solutions_btn = document.getElementById("show-solutions-btn")

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
const SCORE_FACTOR = 1000



try {
  CONTRACT_ADDRESS.MOCHACLE.rinkeby = fs.readFileSync("./contracts/addresses/Mochacle_rinkeby.txt").toString()
  CONTRACT_ADDRESS.MOCHACLE.kovan = fs.readFileSync("./contracts/addresses/Mochacle_kovan.txt").toString()
} catch (err) {
  console.log('Could not load contract addresses.', err.toString())
}

try {
  let LINK_ABI_RAW = fs.readFileSync('./contracts/interfaces/LINK.json');
  ABIS.LINK_ABI = JSON.parse(LINK_ABI_RAW);
  let MOCHACLE_ABI_RAW = fs.readFileSync('./contracts/interfaces/Mochacle.json');
  ABIS.MOCHACLE_ABI = JSON.parse(MOCHACLE_ABI_RAW);
} catch (err) {
  console.log("Couldnt load the ABIs.", err.toString())
}


connect_btn.addEventListener("click", loginHandler);
mocha_test_file.addEventListener("change",testUpload)
mocha_solution_file.addEventListener("change",solutionUpload)
upload_mocha_test_btn.addEventListener("click", submitMochaTestUpload)
upload_mocha_solution_btn.addEventListener("click", submitMochaSolutionUpload)
show_tests_btn.addEventListener("click", mochaTestDisplayHandler)
show_solutions_btn.addEventListener("click", solutionDisplayHandler)
reward_solution_btn.addEventListener("click", ()=>{
  const provider = PROVIDER.INDUCED
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


async function solutionDisplayHandler(){

  console.log('inside solutionDisplayHandler')
  solution_reward_input.style.cursor = 'text'
  // solution_reward_input.placeholder = 'Select solution id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  const provider = PROVIDER.INDUCED
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  displayMySolutionIds(address, 
                       ticket_div,
                       solution_reward_input)
  // remove event listener
  // solution_reward_input.removeEventListener("click", solutionDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}


async function mochaTestDisplayHandler(){
  console.log('inside event listener')
  // first change the cursor style to text
  mocha_target_input.style.cursor = 'text'
  // mocha_target_input.placeholder = 'Select mocha script id'
  // TODO: go back to  mocha_target_input.placeholder = 'Select mocha scripts and their ids' at callback X
  displayMochaTest(ticket_div,
                   mocha_target_input,
                   mocha_solution_file_display)
  // remove event listener
  // mocha_target_input.removeEventListener("click", mochaTestDisplayHandler)
  // TODO: addeventlistener again when submission has been clicked or anything else.
}
