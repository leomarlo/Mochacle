// const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
require('dotenv').config({'path': '../.env'})

// provider_url = process.env.RINKEBY_URL
// provider_url = process.env.LOCALHOST_URL
const provider_url = process.env.KOVAN_URL
const link_contract_address = process.env.LINK_CONTRACT_KOVAN

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}


describe("Testing_h", function() {
  this.timeout(55000);
  describe("Deployment", () => {
    let wallet_alice = new Object()
    let contract_info = new Object()
    // contract_info.address = '0x5a777056010f55a903866Abcb79B37aeF4fCBA77'
    // let provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
    // wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
    //   const res = await hre.artifacts.readArtifact("Testing_h")
    it ("should initialize provider and wallet", async () => {
      const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      const res = await hre.artifacts.readArtifact("Testing_h")
      const ITesting_h = new ethers.utils.Interface(res.abi)
      contract_info.abi = ITesting_h.format()
      contract_info.bytecode = res.bytecode
      // console.log(res.bytecode)
    });
    it ("should deploy the Testing_h contract", async function() {
      const Testing_h = await hre.ethers.getContractFactory(
        contract_info.abi,
        contract_info.bytecode,
        wallet_alice);
      
      // contract_info.y = '0x540d7E428D5207B30EE03F2551Cbb575'
      // contract_info.test = 'hallo test'
      const Testing_h_receipt = await Testing_h.deploy() //contract_info.y, contract_info.test);
      await Testing_h_receipt.deployed();
      contract_info.address = Testing_h_receipt.address;
      console.log('The address is :', contract_info.address)
      console.log("https://kovan.etherscan.io/address/" + contract_info.address)
    });
    it ("should put some LINK to that contract", async function(){
      const LINK_ADDRESS = link_contract_address
      let LINK_ABI_RAW = fs.readFileSync('./test/LINK_ABI.json');
      let LINK_ABI = JSON.parse(LINK_ABI_RAW);

      
      // create the link contract Object
      const LINKcontract = new ethers.Contract(
        LINK_ADDRESS,
        LINK_ABI,
        wallet_alice);
      // get old balance
      const old_balance = await LINKcontract.balanceOf(contract_info.address);
      // fund contract if balance is too low
      let funded_amount = 0.0
      if (parseFloat(ethers.utils.formatEther(old_balance))<0.1){
        // this much should be funded 
        funded_amount = 0.3
        const amount_string = parseFloat(funded_amount).toString()
        let receipt_transfer = await LINKcontract.transfer(
          contract_info.address,
          ethers.utils.parseEther(amount_string));
        await receipt_transfer.wait()
      }
    });
    it ("should get the result for the main oracle", async function() {

      const Testing_h = new hre.ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);

      

      const data_answer_pre = await Testing_h.data_answer();
      console.log("data_answer_pre", data_answer_pre);
      const score = await Testing_h.score();
      console.log("score", score.toString());
      const score_bytes = await Testing_h.score_bytes();
      console.log("score_bytes", score_bytes);
      const script24 = await Testing_h.script24();
      console.log("script24", script24);
      

      
      const checkScore_tx = await Testing_h.requestScore(
        {gasLimit: 400000});
      // console.log("checkScore_tx", checkScore_tx)
      const checkScore_receipt = await checkScore_tx.wait()
      const all_checkScore_events = await checkScore_receipt.events
      const AtTheEndOfRequest_event = all_checkScore_events.find(x => x.event = "RequestSent");
      console.log("requestId:", AtTheEndOfRequest_event.args); 

    });
    it ("should wait for at least 25 seconds and request the answer", async function(){
      await wait(29000);
      const res = await hre.artifacts.readArtifact("Testing_h")
      const ITesting_h = new ethers.utils.Interface(res.abi)
      const Testing_h = new hre.ethers.Contract(
        contract_info.address,
        ITesting_h.format(),
        wallet_alice);
      
      const data_answer_after = await Testing_h.data_answer();
      console.log("data_answer_after", data_answer_after);
      const score = await Testing_h.score();
      console.log("score", score.toString());
      const score_bytes = await Testing_h.score_bytes();
      console.log("score_bytes", score_bytes);
      const script24 = await Testing_h.script24();
      console.log("script24", script24);
    });
  });
});