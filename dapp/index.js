/*
* Title: Main script to orchestrate the web3 interaction with the mochacle contract
* Author: Leonhard Horstmeyer
* Email: leonhard.horstmeyer@gmail.com
* Date: 4th of August 2021
* Version: 0.0.1
*/

import {PROVIDER, ABIS, CONTRACT_ADDRESS, loginHandler} from './utilities/web3'
import {rewardSolutionHandler, submitMochaTestUpload, submitMochaSolutionUpload} from './utilities/contract'
import {displayMochaTest, displayMySolutionIds} from './utilities/display'
import {handleMochaTestFile, handleMochaSolutionFile} from './utilities/fileupload'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()


// display DOMs
const ticket_div = document.getElementById("tickets-div")
const show_tests_btn = document.getElementById("show-tests-btn")
const show_solutions_btn = document.getElementById("show-solutions-btn")

// input and contract interaction DOMs
const mocha_target_input = document.getElementById("test-script-id-input")
const solution_reward_input = document.getElementById("solution-id-input")
const mocha_test_file = document.getElementById("mocha-test-upload-file")
const mocha_test_file_display = document.getElementById("mocha-filename-info")
const mocha_solution_file = document.getElementById("mocha-solution-upload-file")
const mocha_solution_file_display = document.getElementById("solution-filename-info")
const upload_mocha_test_btn = document.getElementById("submit-test-btn")
const upload_mocha_solution_btn = document.getElementById("submit-solution-btn")
const reward_solution_btn = document.getElementById("submit-reward-btn")

// web3 DOMs
const connect_btn = document.getElementById("connect-btn")


// load contract addresses into global variables
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

/**************************************
** Main Event handlers
***************************************/

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
  const provider = PROVIDER.INDUCED
  const signer = provider.getSigner(0);
  const address = await signer.getAddress();
  displayMySolutionIds(address, 
                       ticket_div,
                       solution_reward_input)
}


async function mochaTestDisplayHandler(){
  console.log('inside event listener')
  // first change the cursor style to text
  mocha_target_input.style.cursor = 'text'
  displayMochaTest(ticket_div,
                   mocha_target_input,
                   mocha_solution_file_display)
}
