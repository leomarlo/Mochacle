const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../app/utilities/submission.js");
require('dotenv').config({'path': '../.env'})

describe("TestOracle", function() {
  this.timeout(55000);
  describe("SubmitTest", () => {
    
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let wallet_charlie = new Object()
    let contract_info = new Object()
    let TestOracle = new Object()
    let submissionObj = new Object()
    submissionObj.against_this_test_id = 1130
    it ("should create the wallets and contract", async () => {
      const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
      // not really charlie, but for this test, yes
      wallet_charlie = wallet_alice
      res = await hre.artifacts.readArtifact("TestOracle")
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
      // const _ORACLE_ADDRESS = await TestOracle.ORACLE_ADDRESS()
      // console.log("ORACLE_ADDRESS", _ORACLE_ADDRESS.toString())
      // const _API_URL = await TestOracle.API_URL()
      // console.log("API_URL", _API_URL.toString())
      // const _JOBID = await TestOracle.JOBID()
      // console.log("JOBID", _JOBID.toString())
    });
    it ("should submit a test_template", async ()=> {
      const submission_script = fs.readFileSync("./test/auxilliary_scripts/mocha_script.js").toString();
      submissionObj.submission_script = submission_script
      submissionObj.submit_bytes32 = "0x" + crypto
                .createHash(process.env.HASH_FUNCTION)
                .update(submission_script)
                .digest('hex')

      // test_id should be a test_hash!!       
    });
    it ("should get current test_id", async ()=>{
      const _test_id = await TestOracle.test_id()
      contract_info.test_id = parseInt(_test_id.toString())
      // console.log("test_id", contract_info.test_id.toString())
      
    });
    it ("should submit to aws server with Charlie", async ()=>{
      let submitter = "Charlie"
      let token = process.env.CHARLIE_NEW_TOKEN
      submissionObj.SCORE_FACTOR = 10**3
      submissionObj.pass_fraction = 0.8 
      console.log("contract_info.test_id", contract_info.test_id)
      await submitTest(
        submitter,
        token,
        submissionObj.submission_script,
        contract_info.test_id,
        submissionObj.pass_fraction,
        {"random": "1.1.1"})
    });
    it ("should submit to the TestOracle smart contract on Rinkeby", async ()=>{
      const submitTest_receipt = await TestOracle.submitTest(
        submissionObj.submit_bytes32,
        submissionObj.pass_fraction * submissionObj.SCORE_FACTOR,
        {value: ethers.utils.parseEther("0.15")});
      await submitTest_receipt.wait()

      const _test_id = await TestOracle.test_id()
      const new_test_id = parseInt(_test_id.toString())
      console.log("new test_id ", new_test_id)
      contract_info.test_id = new_test_id

    });
    it ("should get the solution script", async ()=> {
      const solution_script = fs.readFileSync("./test/auxilliary_scripts/solution_script.js").toString();
      submissionObj.solution_script = solution_script
      submissionObj.solution_bytes32 = "0x" + crypto
                .createHash(process.env.HASH_FUNCTION)
                .update(solution_script)
                .digest('hex')
   
    });
    it ("should get current solution_id", async ()=>{
      const _solution_id = await TestOracle.solution_id()
      contract_info.solution_id = parseInt(_solution_id.toString())
      console.log("solution_id", contract_info.solution_id.toString())
      
    });
    it ("should submit a solution to aws by Bob", async()=>{
      let _test_id = submissionObj.against_this_test_id
      let submitter = "Bob"
      let token = process.env.BOB_NEW_TOKEN
      await submitSolution(
        submitter,
        token,
        submissionObj.solution_script,
        _test_id,
        contract_info.solution_id, 
        {"random": "1.1.1"})
    });
    it ("should submit a solution to the contract by Bob", async ()=>{
      let _test_id = submissionObj.against_this_test_id
      const TestOracleBob = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_bob);
      const submitSolution_receipt_bob = await TestOracleBob.submitSolution(
        _test_id,
        submissionObj.solution_bytes32)
      await submitSolution_receipt_bob.wait()

      const _solution_id = await TestOracleBob.solution_id()
      const new_solution_id = parseInt(_solution_id.toString())
      console.log("new solution_id ", new_solution_id)
      contract_info.solution_id = new_solution_id
    });
    it ("Bob or Mike should run Bobs submission", async ()=>{
      let old_solution_id = contract_info.solution_id - 1
      let submitter = "Bob"
      let token = process.env.BOB_NEW_TOKEN
      await runSubmission(
        submitter,
        token,
        old_solution_id)
      console.log('"Bob" submitted this id :', old_solution_id, `. Take 4 sec to check it out on http://3.122.74.152:8011/submission_ids/${old_solution_id}`)

      // setTimeout(() => {  console.log("4 Seconds are over!"); }, 4000);
      
    });
    it ("should get the link balance of the contract", async ()=>{
      const LINK_RINKEBY_ADDRESS = "0x01be23585060835e02b77ef475b0cc51aa1e0709"
      let LINK_RINKEBY_ABI_RAW = fs.readFileSync('./test/LINK_RINKEBY_ABI.json');
      let LINK_RINKEBY_ABI = JSON.parse(LINK_RINKEBY_ABI_RAW);
      // create the link contract Object
      const LINKcontract = new ethers.Contract(
        LINK_RINKEBY_ADDRESS,
        LINK_RINKEBY_ABI,
        wallet_alice);
      // get old balance
      const balance = await LINKcontract.balanceOf(contract_info.address);
      console.log("contract has this many link tokens", parseFloat(ethers.utils.formatEther(balance)))
    })
    it ("should get Bobs balance", async ()=>{
      let balance_of_bob_before = await wallet_bob.getBalance()
      console.log("balance_of_bob_before", ethers.utils.formatEther(balance_of_bob_before))
    })
    it ("Submitter, so Charlie (aka Alice) should ask to check the solution ", async ()=>{
      let _test_id = submissionObj.against_this_test_id
      let old_solution_id = contract_info.solution_id - 1
      console.log(old_solution_id)

      const checkScore_tx = await TestOracle.requestScore(
        old_solution_id,
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const RequestHasBeenSent_event = await checkScore_receipt.events.find(x => x.event = "RequestHasBeenSent");
      // console.log("checkScore_receipt.events", checkScore_receipt.events)
      // console.log("RequestHasBeenSent_event", RequestHasBeenSent_event ); 
      // console.log("checkScore_receipt ", checkScore_receipt)
    });
    it ("should wait for a little while and request Bobs balance", async ()=>{
      setTimeout(() => {  console.log("5 Seconds are over!"); }, 5000);

      let balance_of_bob_after = await wallet_bob.getBalance()
      console.log("balance_of_bob_after", ethers.utils.formatEther(balance_of_bob_after))
    });
  });
});