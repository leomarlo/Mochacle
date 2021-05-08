const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../app/utilities/submission.js");
const {addUsers, getUsers, installRightsForUsers} = require("../app/utilities/admin.js");
const {changePassword} = require("../app/utilities/users.js");
require('dotenv').config({'path': '../.env'})

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe("TestOracle", function() {
  this.timeout(55000);
  describe("SubmitTest", () => {
    
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let wallet_charlie = new Object()

    let address_alice = process.env.ADDRESS_ALICE
    let address_bob = process.env.ADDRESS_BOB
    let address_charlie = process.env.ADDRESS_CHARLIE

    let init_mocha_server_token = 'whatever'
    let charlies_new_password = process.env.CHARLIE_NEW_TOKEN
    let alice_new_password = process.env.ALICE_NEW_TOKEN
    let bob_new_password = process.env.BOB_NEW_TOKEN

    let test_id = ''
    let solution_1_id = ''
    let solution_2_id = ''

    let contract_info = new Object()
    let TestOracle = new Object()
    let submissionObj = new Object()

    let provider_url = process.env.KOVAN_URL
    let link_contract_address = process.env.LINK_CONTRACT_KOVAN
    it ("should create the wallets and contract", async () => {
      // get Rinkeby provider
      const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
      
      // create wallets for alice, bob and charlie
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
      wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
      
      // receive the abi and bytecode of the TestOracle contract
      res = await hre.artifacts.readArtifact("TestOracle")
      // get the interface of the TestOracle contract via its abi
      const ITestOracle = new ethers.utils.Interface(res.abi)
      contract_info.abi = ITestOracle.format()
      contract_info.bytecode = res.bytecode
      contract_info.address = fs.readFileSync("./test/TestOracle_contract_address.txt").toString()
   
    });
    it ("should connect signer to contract", async function() {
      TestOracle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
    });
    it ("should get some public information from the contract", async ()=>{
      const _owner = await TestOracle.owner()
      console.log("owner", _owner.toString())
    });

    // Submission of Mocha Test by Charlie
    it ("Admin should add Charlie to the mocha server accounts", async function(){
      const pr = await addUsers(
                        process.env.ADMIN_TOKEN,
                        [address_charlie],
                        init_mocha_server_token)
      console.log(pr)
    });
    it ("Admin should add Alice and Bob to the mocha server accounts", async function(){
      const pr = await addUsers(
                        process.env.ADMIN_TOKEN,
                        [address_alice, address_bob],
                        init_mocha_server_token)
      console.log(pr)
    });
    it ("Chalie should change his password", async function(){
      const pr = await changePassword(
                          address_charlie,
                          init_mocha_server_token,
                          charlies_new_password)
      console.log(pr)
    });
    it ("Alice and Bob should change their passwords", async function(){
      let pr_alice = await changePassword(
        address_alice,
        init_mocha_server_token,
        alice_new_password)
      console.log('alices new password', pr_alice)
      let pr_bob = await changePassword(
                          address_bob,
                          init_mocha_server_token,
                          bob_new_password)
      console.log('bobs new password', pr_bob)
    });
    it ("Charlie should submit this test_mocha to aws server", async ()=>{

      let mocha_script_string = fs.readFileSync("./test/auxilliary_scripts/mocha_script.js").toString()
      let mocha_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_string)
              .digest('hex')
      const test_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_hash + address_charlie)
              .digest('hex')
      test_id = test_id_20byte.slice(0,32)
      
      
      const pass_fraction = 0.9
      submissionObj.test_script = mocha_script_string;
      submissionObj.test_id = test_id;
      submissionObj.submit_test_id = "0x" + test_id;
      submissionObj.submit_mocha_test_bytes20 = "0x" + mocha_script_hash;
      submissionObj.pass_fraction = pass_fraction;
      // console.log('submissionObj', submissionObj)

      const packages_required = {
              'fs': '1.1.1',
              'random': '1.1.1'
          }

      const pr = await submitTest(
              address_charlie,
              charlies_new_password,
              mocha_script_string,
              test_id,
              pass_fraction,
              packages_required,
          )
      console.log(pr.status)
    });
    it ("should connect Charlie as signer to the contract", async function() {
      TestOracle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_charlie);
    });
    it ("Charlie submits to the TestOracle smart contract on Rinkeby", async function(){
      const submitTest_tx = await TestOracle.submitTest(
        submissionObj.submit_test_id,
        submissionObj.submit_mocha_test_bytes20,
        Math.round(submissionObj.pass_fraction * parseInt(process.env.SCORE_FACTOR)),
        {value: ethers.utils.parseEther("0.15")});
      const submitTest_receipt = await submitTest_tx.wait()
      
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      // console.log(submitTest_receipt_event.args[0], submissionObj.submit_test_id);
      const balance_of_contract = await wallet_alice.provider.getBalance(contract_info.address)
      console.log('balance of the contract is:', ethers.utils.formatEther(balance_of_contract))
      assert.equal(submitTest_receipt_event.args[0], submissionObj.submit_test_id)
    });

    it ("Alice submits a solution to aws", async()=>{

      let solution_script_string = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString()
      let solution_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_string)
              .digest('hex')
      const solution_1_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_hash + address_alice)
              .digest('hex')
      solution_1_id = solution_1_id_20byte.slice(0,32)
      const packages_required = {
              'fs': '1.1.1'
          }
      
      submissionObj.solution_script = solution_script_string;
      submissionObj.solution_1_id = solution_1_id;
      submissionObj.submit_solution_1_id = "0x" + solution_1_id;
      submissionObj.submit_solution_1_script_hash = "0x" + solution_script_hash

      const pr = await submitSolution(
          address_alice,
          alice_new_password,
          solution_script_string,
          submissionObj.test_id,
          solution_1_id,
          packages_required)
      console.log(pr.status)
    });
    it ("Alice should submit a solution to the contract", async function(){
      // let _test_id = submissionObj.against_this_test_id
      const TestOracleAlice = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
      const submitSolution_tx_alice = await TestOracleAlice.submitSolution(
        submissionObj.submit_test_id,
        submissionObj.submit_solution_1_id,
        submissionObj.submit_solution_1_script_hash,
        {gasLimit: 400000})
      const submitSolution_receipt_alice = await submitSolution_tx_alice.wait()
      const submitSolution_receipt_alice_event = await submitSolution_receipt_alice.events.find(x => x.event = "submittedSolution");
      console.log(submitSolution_receipt_alice_event.args[0],submissionObj.submit_solution_1_id);
      assert.equal(submitSolution_receipt_alice_event.args[0],submissionObj.submit_solution_1_id);
    });
    it ("Charlie runs Alices solution submission on aws", async ()=>{
      const pr = await runSubmission(
          address_charlie,
          charlies_new_password,
          submissionObj.solution_1_id)
      // console.log(pr)
      console.log('"Alice" submitted this id :', submissionObj.solution_1_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${submissionObj.solution_1_id}`)
      // await timeout(4000);
      
    });
    it ("should get the link balance of the contract", async function(){
      const LINK_ADDRESS = link_contract_address
      let LINK_ABI_RAW = fs.readFileSync('./test/LINK_ABI.json');
      let LINK_ABI = JSON.parse(LINK_ABI_RAW);
      // create the link contract Object
      const LINKcontract = new ethers.Contract(
        LINK_ADDRESS,
        LINK_ABI,
        wallet_alice);
      // get old balance
      const balance = await LINKcontract.balanceOf(contract_info.address);
      console.log("contract has this many link tokens: ", parseFloat(ethers.utils.formatEther(balance)))
    });
    it ("should get Alice balance before", async ()=>{
      let balance_of_alice_before = await wallet_alice.getBalance()
      console.log("balance_of_alice_before", ethers.utils.formatEther(balance_of_alice_before))
    });
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
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "Event1");
      // console.log("all events", all_checkScore_events)
      console.log("urls:", AtTheEndOfRequest_event.args); 
      console.log('finished')
    });
    it ("should wait for a little while and request Alice balance", async ()=>{
      await wait(35000);
      console.log("35 Seconds are over!");
      let balance_of_alice_after = await wallet_alice.getBalance()
      console.log("balance_of_alice_after", ethers.utils.formatEther(balance_of_alice_after))
    });
  });
});