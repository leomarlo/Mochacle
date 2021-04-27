const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
require('dotenv').config({'path': '../.env'})

describe("TestOracle", function() {
  this.timeout(55000);
  describe("Deployment", () => {
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let wallet_charlie = new Object()
    let contract_info = new Object()
    it ("should initialize provider and wallet", async () => {
      const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
      wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
      // console.log(wallet_bob)
      // let bl = await wallet_alice.getBalance()
      // console.log(ethers.utils.formatEther(bl))
      res = await hre.artifacts.readArtifact("TestOracle")
      const IExampleAPIs = new ethers.utils.Interface(res.abi)
      // console.log(IExampleAPIs.format())


      contract_info.abi = IExampleAPIs.format()
      contract_info.bytecode = res.bytecode
      // console.log(contract_info)
      // let compiled = require(`./build/${process.argv[2]}.json`);

    });
    it ("should deploy the example API contract", async function() {
      // create the contract handler of etherjs
      // console.log(typeof(contract_info.abi))
      // console.log(typeof(contract_info.bytecode))
      // console.log(wallet_bob)
      const TestOracle = await hre.ethers.getContractFactory(
        contract_info.abi,
        contract_info.bytecode,
        wallet_alice);
      const fee = ethers.utils.parseEther(process.env.ORACLE_RINKEBY_FEE_1)
      const testOracle_receipt = await TestOracle.deploy();
      await testOracle_receipt.deployed();
      contract_info.address = testOracle_receipt.address;
    });
    it("should save the contract address to file", () => {
      fs.writeFileSync('./test/TestOracle_contract_address.txt', contract_info.address)
    });
    it ("should transfer some link token from alice to contract", async () => {
        const LINK_RINKEBY_ADDRESS = "0x01be23585060835e02b77ef475b0cc51aa1e0709"
        let LINK_RINKEBY_ABI_RAW = fs.readFileSync('./test/LINK_RINKEBY_ABI.json');
        let LINK_RINKEBY_ABI = JSON.parse(LINK_RINKEBY_ABI_RAW);
  
        
        // create the link contract Object
        const LINKcontract = new ethers.Contract(
          LINK_RINKEBY_ADDRESS,
          LINK_RINKEBY_ABI,
          wallet_alice);
        // get old balance
        const old_balance = await LINKcontract.balanceOf(contract_info.address);
        // fund contract if balance is too low
        let funded_amount = 0.0
        if (parseFloat(ethers.utils.formatEther(old_balance))<1.0){
          // this much should be funded 
          funded_amount = 2.0
          const amount_string = parseFloat(funded_amount).toString()
          let receipt_transfer = await LINKcontract.transfer(
            contract_info.address,
            ethers.utils.parseEther(amount_string));
          await receipt_transfer.wait()
        }
  
        const new_balance = await LINKcontract.balanceOf(contract_info.address);
        // console.log(ethers.utils.formatEther(old_balance))
        
        // console.log(ethers.utils.formatEther(new_balance))
        assert.equal(
            parseFloat(ethers.utils.formatEther(new_balance)),
            parseFloat(ethers.utils.formatEther(old_balance)) + funded_amount)
      }); 
  });
});