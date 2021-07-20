const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../utilities/submission.js");
const {addUsers, getUsers, installRightsForUsers} = require("../utilities/admin.js");
const {changePassword, registerNewUser} = require("../utilities/users.js");
require('dotenv').config({'path': '../.env'})

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

NETWORK_SPECS = {
  kovan: {
    name: "kovan",
    chain_id: 42
  },
  rinkeby: {
    name: "rinkeby",
    chain_id: 4
  },
  ropsten: {
    name: "ropsten",
    chain_id: 3
  }
}


let contract_address_file_root = './app/contracts/addresses/'
let interfaces_address_file_root = './app/contracts/interfaces/'
let link_abi_file = interfaces_address_file_root + 'LINK.json'

// TODO! Change here and in the hardhat-config the network!
const current_network = NETWORK_SPECS.kovan;
let provider_url = process.env.KOVAN_URL
let link_contract_address = process.env.LINK_CONTRACT_KOVAN
let contract_address_filename = contract_address_file_root + 'TestOracle_kovan.txt'

describe("TestOracle", function() {
  this.timeout(55000);

  let wallet_alice = new Object()
  let wallet_bob = new Object()
  let wallet_charlie = new Object()

  let address_alice = process.env.ADDRESS_ALICE
  let address_bob = process.env.ADDRESS_BOB
  let address_charlie = process.env.ADDRESS_CHARLIE

  const passwords = new Object()
  passwords["alice"] = address_alice.slice(-10,) //process.env.ALICE_NEW_TOKEN
  passwords["bob"] = address_bob.slice(-10,) //process.env.BOB_NEW_TOKEN
  passwords["charlie"] = address_charlie.slice(-10,) //process.env.CHARLIE_NEW_TOKEN

  

  let test_id = ''
  let test_id_2 = ''
  let solution_11_id = ''
  let solution_12_id = ''
  let solution_21_id = ''
  let solution_22_id = ''

  let contract_info = new Object()
  let TestOracle = new Object()
  let submissionObj = new Object()

  describe("Initialize Contract and Wallet", () => {
    
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
      contract_info.address = fs.readFileSync(contract_address_filename).toString()
   
    });
    it ("should connect alice as signer to TestOracle contract", async function() {
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
    it ("Alice, Bob and Charlie register accounts at the mocha server", async function(){
      let pr_alice = await registerNewUser(
              process.env.ADDRESS_ALICE,
              passwords['alice'],
              'kovan')
      console.log(pr_alice)
      let pr_bob = await registerNewUser(
              process.env.ADDRESS_BOB,
              passwords['bob'],
              'kovan')
      console.log(pr_bob)
      let pr_charlie = await registerNewUser(
              process.env.ADDRESS_CHARLIE,
              passwords['charlie'],
              'kovan')
      console.log(pr_charlie)
    });
  });
  describe("Charlie submits a test and Alice should submit a solution.", () => {
    it ("Charlie should submit this test_mocha to aws server", async ()=>{
      let mocha_script_string = fs.readFileSync("./test/auxilliary_scripts/mocha_script.js").toString()
      let mocha_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_string)
              .digest('hex')
      const test_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_hash + address_charlie + current_network.chain_id)
              .digest('hex')
      // 16 bytes, so that a 32 bytes string can be generated from the literals
      test_id = test_id_20byte.slice(0,32)  
      const pass_fraction = 0.9
      submissionObj.test_script = mocha_script_string;
      submissionObj.test_id = test_id;
      submissionObj.submit_test_id = "0x" + test_id;
      submissionObj.submit_mocha_test_bytes20 = "0x" + mocha_script_hash;
      submissionObj.pass_fraction = pass_fraction;

      const packages_required = {
              'fs': '1.1.1',
              'random': '1.1.1'}
      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitTest(
              process.env.ADDRESS_CHARLIE,
              passwords['charlie'],
              mocha_script_string,
              test_id,
              current_network.chain_name,
              current_network.chain_id,
              pass_fraction,
              packages_required,
              transaction_hash,
              transaction_url)
      console.log(pr.status)
    });
    it ("should connect Charlie as signer to the contract", async function() {
      TestOracle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_charlie);
    });
    it ("Charlie submits to the TestOracle smart contract on Kovan", async function(){
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
      const solution_11_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_hash + address_alice + current_network.chain_id)
              .digest('hex')
      solution_11_id = solution_11_id_20byte.slice(0,32)
      const packages_required = {
              'fs': '1.1.1'
          }
      
      submissionObj.solution_script = solution_script_string;
      submissionObj.solution_11_id = solution_11_id;
      submissionObj.submit_solution_11_id = "0x" + solution_11_id;
      submissionObj.submit_solution_11_script_hash = "0x" + solution_script_hash

      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitSolution(
          process.env.ADDRESS_ALICE,
          passwords['alice'],
          solution_script_string,
          submissionObj.test_id,
          solution_11_id,
          current_network.chain_name,
          current_network.chain_id,
          packages_required,
          transaction_hash,
          transaction_url)
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
        submissionObj.submit_solution_11_id,
        submissionObj.submit_solution_11_script_hash,
        {gasLimit: 400000})
      const submitSolution_receipt_alice = await submitSolution_tx_alice.wait()
      const submitSolution_receipt_alice_event = await submitSolution_receipt_alice.events.find(x => x.event = "submittedSolution");
      console.log(submitSolution_receipt_alice_event.args[0],submissionObj.submit_solution_11_id);
      console.log('"Alice" submitted this id :', submissionObj.solution_11_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${submissionObj.solution_11_id}`)      
      assert.equal(submitSolution_receipt_alice_event.args[0],submissionObj.submit_solution_11_id);
    });
    it ("Charlie runs Alices solution submission on aws", async ()=>{
      const pr = await runSubmission(
          process.env.ADDRESS_CHARLIE,
          passwords['charlie'],
          submissionObj.solution_11_id)
      // console.log(pr)
     // await timeout(4000);
      
    });
    it ("should get the link balance of the contract", async function(){
      const LINK_ADDRESS = link_contract_address
      let LINK_ABI_RAW = fs.readFileSync(link_abi_file);
      let LINK_ABI = JSON.parse(LINK_ABI_RAW);
      // create the link contract Object
      const LINKcontract = new ethers.Contract(
        LINK_ADDRESS,
        LINK_ABI,
        wallet_alice);
      // get old balance
      const old_balance = await LINKcontract.balanceOf(contract_info.address);
      console.log("contract has this many link tokens: ", parseFloat(ethers.utils.formatEther(old_balance)))
      // });
      // it ("should transfer some link token from alice to contract", async () => {
      let funded_amount = 0.0
      if (parseFloat(ethers.utils.formatEther(old_balance))<0.1){
        // this much should be funded 
        funded_amount = 1.0
        const amount_string = parseFloat(funded_amount).toString()
        let receipt_transfer = await LINKcontract.transfer(
          contract_info.address,
          ethers.utils.parseEther(amount_string));
        await receipt_transfer.wait()
      }

      const new_balance = await LINKcontract.balanceOf(contract_info.address);
      console.log("now the contract has this many link tokens: ", parseFloat(ethers.utils.formatEther(new_balance)))
      
      assert.equal(
          parseFloat(ethers.utils.formatEther(new_balance)),
          parseFloat(ethers.utils.formatEther(old_balance)) + funded_amount)
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
        submissionObj.submit_solution_11_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "Event1");
      // console.log("all events", all_checkScore_events)
      console.log("urls:", all_checkScore_events); 
      console.log('finished')
    });
    it ("should wait for a little while and request Alice balance", async ()=>{
      await wait(35000);
      console.log("35 Seconds are over!");
      let balance_of_alice_after = await wallet_alice.getBalance()
      console.log("balance_of_alice_after", ethers.utils.formatEther(balance_of_alice_after))
    });
  });

  describe("Bob should submit another solution, too late. He shouldnt get a reward.", () => {
    it ("Bob submits a solution to aws", async()=>{
      let solution_script_string_12 = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString()
      solution_script_string_12 += '\n'
      let solution_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_string_12)
              .digest('hex')
      const solution_12_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_hash + address_bob + current_network.chain_id)
              .digest('hex')
      solution_12_id = solution_12_id_20byte.slice(0,32)
      const packages_required = {'fs': '1.1.1'}
      
      submissionObj.solution_script_12 = solution_script_string_12;
      submissionObj.solution_12_id = solution_12_id;
      submissionObj.submit_solution_12_id = "0x" + solution_12_id;
      submissionObj.submit_solution_12_script_hash = "0x" + solution_script_hash

      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitSolution(
          process.env.ADDRESS_BOB,
          passwords['bob'],
          solution_script_string_12,
          submissionObj.test_id,
          solution_12_id,
          current_network.chain_name,
          current_network.chain_id,
          packages_required,          
          transaction_hash,
          transaction_url)
      // console.log(pr.status)
    });
    it ("Bob should submit his solution to the contract", async function(){
      // let _test_id = submissionObj.against_this_test_id
      const TestOracleBob = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_bob);
      const submitSolution_tx_bob = await TestOracleBob.submitSolution(
        submissionObj.submit_test_id,
        submissionObj.submit_solution_12_id,
        submissionObj.submit_solution_12_script_hash,
        {gasLimit: 400000})
      const submitSolution_receipt_bob = await submitSolution_tx_bob.wait()
      const submitSolution_receipt_bob_event = await submitSolution_receipt_bob.events.find(x => x.event = "submittedSolution");
      console.log(submitSolution_receipt_bob_event.args[0],submissionObj.submit_solution_12_id);
      console.log('"Bob" submitted this id :', submissionObj.solution_12_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${submissionObj.solution_12_id}`)      
      assert.equal(submitSolution_receipt_bob_event.args[0],submissionObj.submit_solution_12_id);
    });
    it ("Bob runs his own solution submission on aws", async ()=>{
      const pr = await runSubmission(
          process.env.ADDRESS_BOB,
          passwords['bob'],
          submissionObj.solution_12_id)
      // console.log(pr)
     // await timeout(4000);
    });

    it ("should get Bobs balance before", async ()=>{
      let balance_of_bob_before = await wallet_bob.getBalance()
      console.log("balance_of_bob_before", ethers.utils.formatEther(balance_of_bob_before))
    });
    it ("Owner of contract or submitter, so Charlie in this case, should ask to check the solution (even though the reward has already been given to Alice)", async function(){

      const checkScore_tx = await TestOracle.requestScore(
        submissionObj.submit_solution_12_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "Event1");
      // console.log("all events", all_checkScore_events)
      console.log("urls:", AtTheEndOfRequest_event.args); 
      console.log('finished')
    });
    it ("should wait for a little while and request Bobs balance", async ()=>{
      await wait(30000);
      console.log("30 Seconds are over!");
      let balance_of_bob_after = await wallet_bob.getBalance()
      console.log("balance_of_bob_after", ethers.utils.formatEther(balance_of_bob_after))
    });
  });
  

  describe("Alice submits a test and Charlie submits a bad solution, but Bob then submits a correct solution.", () => {
    it ("Alice should submit this test_mocha to aws server", async ()=>{
      let mocha_script_string = fs.readFileSync("./test/auxilliary_scripts/mocha_script_lower_pass.js").toString()
      let mocha_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_string)
              .digest('hex')
      const test_id_2_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(mocha_script_hash + address_alice + current_network.chain_id)
              .digest('hex')
      // 16 bytes, so that a 32 bytes string can be generated from the literals
      test_id_2 = test_id_2_20byte.slice(0,32)  
      const pass_fraction = 0.75
      submissionObj.test_script_2 = mocha_script_string;
      submissionObj.test_id_2 = test_id_2;
      submissionObj.submit_test_id_2 = "0x" + test_id_2;
      submissionObj.submit_mocha_test_2_bytes20 = "0x" + mocha_script_hash;
      submissionObj.pass_fraction_2 = pass_fraction;

      const packages_required = {
              'fs': '1.1.1',
              'random': '1.1.1'}


      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitTest(
              process.env.ADDRESS_ALICE,
              passwords['alice'],
              mocha_script_string,
              test_id_2,
              current_network.chain_name,
              current_network.chain_id,
              pass_fraction,
              packages_required,
              transaction_hash,
              transaction_url)
      // console.log(pr.status)
    });
    it ("Alice submits to the TestOracle smart contract on Kovan", async function(){
      let TestOracleAlice = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
      const submitTest_tx = await TestOracleAlice.submitTest(
        submissionObj.submit_test_id_2,
        submissionObj.submit_mocha_test_2_bytes20,
        Math.round(submissionObj.pass_fraction_2 * parseInt(process.env.SCORE_FACTOR)),
        {value: ethers.utils.parseEther("0.105")});
      const submitTest_receipt = await submitTest_tx.wait()
      const submitTest_receipt_event = await submitTest_receipt.events.find(x => x.event = "submittedTest");
      // console.log(submitTest_receipt_event.args[0], submissionObj.submit_test_id);
      const balance_of_contract = await wallet_alice.provider.getBalance(contract_info.address)
      console.log('balance of the contract is:', ethers.utils.formatEther(balance_of_contract))
      assert.equal(submitTest_receipt_event.args[0], submissionObj.submit_test_id_2)
    });
    it ("Charlie submits a bad solution to aws", async()=>{
      let solution_script_string = fs.readFileSync("./test/auxilliary_scripts/solution_script_2.js").toString()
      let solution_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_string)
              .digest('hex')
      const solution_21_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_hash + address_charlie + current_network.chain_id)
              .digest('hex')
      solution_21_id = solution_21_id_20byte.slice(0,32)
      const packages_required = {
              'fs': '1.1.1'}
      
      submissionObj.solution_script_21 = solution_script_string;
      submissionObj.solution_21_id = solution_21_id;
      submissionObj.submit_solution_21_id = "0x" + solution_21_id;
      submissionObj.submit_solution_21_script_hash = "0x" + solution_script_hash

      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitSolution(
          process.env.ADDRESS_CHARLIE,
          passwords['charlie'],
          solution_script_string,
          submissionObj.test_id_2,
          solution_21_id,
          current_network.chain_name,
          current_network.chain_id,
          packages_required,
          transaction_hash,
          transaction_url)
      // console.log(pr.status)
    });
    it ("Charlie should submit that solution to the contract", async function(){
      // let _test_id = submissionObj.against_this_test_id
      const TestOracleCharlie = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_charlie);
      const submitSolution_tx_charlie = await TestOracleCharlie.submitSolution(
        submissionObj.submit_test_id_2,
        submissionObj.submit_solution_21_id,
        submissionObj.submit_solution_21_script_hash,
        {gasLimit: 400000})
      const submitSolution_receipt_charlie = await submitSolution_tx_charlie.wait()
      const submitSolution_receipt_charlie_event = await submitSolution_receipt_charlie.events.find(x => x.event = "submittedSolution");
      console.log(submitSolution_receipt_charlie_event.args[0],submissionObj.submit_solution_21_id);
      console.log('"Charlie" submitted this id :', submissionObj.solution_21_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${submissionObj.solution_21_id}`)      
      assert.equal(submitSolution_receipt_charlie_event.args[0],submissionObj.submit_solution_21_id);
    });
    it ("Charlie runs his own solution submission on aws", async ()=>{
      const pr = await runSubmission(
          process.env.ADDRESS_CHARLIE,
          passwords['charlie'],
          submissionObj.solution_21_id)
      // console.log(pr)
    });
    it ("should get Charlies balance before", async function (){
      this.timeout(55000);
      let balance_of_charlie_before = await wallet_charlie.getBalance()
      console.log("balance_of_charlie_before", ethers.utils.formatEther(balance_of_charlie_before))
    });
    it ("Owner of contract or submitter, so Alice in this case, should ask to check the solution of Charlie (which shouldnt pass)", async function(){
      TestOracleAlice = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
      const checkScore_tx = await TestOracleAlice.requestScore(
        submissionObj.submit_solution_21_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "Event1");
      // console.log("all events", all_checkScore_events)
      console.log("urls:", AtTheEndOfRequest_event.args); 
      console.log('finished')
    });
    it ("should wait for a little while and request Charlies balance", async function (){
      await wait(35000);
      console.log("35 Seconds are over!");
      let balance_of_charlie_after = await wallet_charlie.getBalance()
      console.log("balance_of_charlie_after", ethers.utils.formatEther(balance_of_charlie_after))
    });

  });

  describe("Bob should submit another solution, not too late. He should get the reward.", () => {
    it ("Bob submits a solution to aws", async()=>{
      let solution_script_string_22 = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString()
      solution_script_string_22 += ' '
      let solution_script_hash = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_string_22)
              .digest('hex')
      const solution_22_id_20byte = crypto
              .createHash(process.env.BYTES20_HASH_FUNCTION.toString())
              .update(solution_script_hash + address_bob + current_network.chain_id)
              .digest('hex')
      solution_22_id = solution_22_id_20byte.slice(0,32)
      const packages_required = {'fs': '1.1.1'}
      
      submissionObj.solution_script_22 = solution_script_string_22;
      submissionObj.solution_22_id = solution_22_id;
      submissionObj.submit_solution_22_id = "0x" + solution_22_id;
      submissionObj.submit_solution_22_script_hash = "0x" + solution_script_hash

      let transaction_hash = ''
      let transaction_url = ''
      const pr = await submitSolution(
          process.env.ADDRESS_BOB,
          passwords['bob'],
          solution_script_string_22,
          submissionObj.test_id_2,
          solution_22_id,
          current_network.chain_name,
          current_network.chain_id,
          packages_required,
          transaction_hash,
          transaction_url)
      // console.log(pr.status)
    });
    it ("Bob should submit his solution to the contract", async function(){
      // let _test_id = submissionObj.against_this_test_id
      const TestOracleBob = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_bob);
      const submitSolution_tx_bob = await TestOracleBob.submitSolution(
        submissionObj.submit_test_id_2,
        submissionObj.submit_solution_22_id,
        submissionObj.submit_solution_22_script_hash,
        {gasLimit: 400000})
      const submitSolution_receipt_bob = await submitSolution_tx_bob.wait()
      const submitSolution_receipt_bob_event = await submitSolution_receipt_bob.events.find(x => x.event = "submittedSolution");
      console.log(submitSolution_receipt_bob_event.args[0],submissionObj.submit_solution_22_id);
      console.log('"Bob" submitted this id :', submissionObj.solution_22_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${submissionObj.solution_22_id}`)      
      assert.equal(submitSolution_receipt_bob_event.args[0],submissionObj.submit_solution_22_id);
    });
    it ("Bob runs his own solution submission on aws", async ()=>{
      const pr = await runSubmission(
          process.env.ADDRESS_BOB,
          passwords['bob'],
          submissionObj.solution_22_id)
      // console.log(pr)
     // await timeout(4000);
    });

    it ("should get Bobs balance before", async ()=>{
      let balance_of_bob_before = await wallet_bob.getBalance()
      console.log("balance_of_bob_before", ethers.utils.formatEther(balance_of_bob_before))
    });
    it ("Owner of contract or submitter, so Alice in this case, should ask to check the solution of Charlie (which shouldnt pass)", async function(){
      const TestOracleAlice = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
      const checkScore_tx = await TestOracleAlice.requestScore(
        submissionObj.submit_solution_22_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "Event1");
      // console.log("all events", all_checkScore_events)
      console.log("urls:", AtTheEndOfRequest_event.args); 
      console.log('finished')
    });
    it ("should wait for a little while and request Bobs balance", async ()=>{
      await wait(30000);
      console.log("30 Seconds are over!");
      let balance_of_bob_after = await wallet_bob.getBalance()
      console.log("balance_of_bob_after", ethers.utils.formatEther(balance_of_bob_after))
    });

  });
});