const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../utilities/submission.js");
const {addUsers, getUsers, installRightsForUsers} = require("../utilities/admin.js");
const {changePassword} = require("../utilities/users.js");
require('dotenv').config({'path': '../.env'})

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe("TestOracle_Kovan", function() {
  this.timeout(55000);
  describe("Check Score", () => {
    
    const contract_info = new Object()
    const submissionObj = new Object()
    const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
    
    let provider_url = process.env.KOVAN_URL
    // let link_contract_address = process.env.LINK_CONTRACT_KOVAN
    // create wallets for alice, bob and charlie
    let wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
    res = await hre.artifacts.readArtifact("TestOracle")
    // get the interface of the TestOracle contract via its abi
    const ITestOracle = new ethers.utils.Interface(res.abi)
    contract_info.abi = ITestOracle.format()
    contract_info.bytecode = res.bytecode
    contract_info.address = fs.readFileSync("./test/TestOracle_contract_address.txt").toString()
    
    submissionObj.submit_solution_1_id = '0x' + 'dbe3ca7f0d3e05bbfd4daa5e0fe0b053'


    it ("Owner of contract or submitter, so Charlie in this case, should ask to check the solution", async function(){
      // let _test_id = submissionObj.against_this_test_id
      // let old_solution_id = contract_info.solution_id - 1
      // console.log(old_solution_id)
      const checkScore_tx = await TestOracle.requestScore(
        submissionObj.submit_solution_1_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "AtTheEndOfRequest");
      
      console.log("urls:", AtTheEndOfRequest_event.args); 
    });
  });
});