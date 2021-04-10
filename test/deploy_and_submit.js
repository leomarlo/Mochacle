const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
require('dotenv').config({'path': '../.env'})

describe("TestOracle", function() {
  this.timeout(55000);
  describe("Deployment", () => {
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let contract_info = new Object()
    it ("should initialize provider and wallet", async () => {
      const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
      // console.log(wallet_bob)
      // let bl = await wallet_alice.getBalance()
      // console.log(ethers.utils.formatEther(bl))
      res = await hre.artifacts.readArtifact("ExampleAPI")
      const IExampleAPIs = new ethers.utils.Interface(res.abi)
      // console.log(IExampleAPIs.format())


      contract_info.abi = IExampleAPIs.format()
      contract_info.bytecode = res.bytecode
      // console.log(contract_info)
      // let compiled = require(`./build/${process.argv[2]}.json`);

    });
    it ("should deploy the example API contract", async function() {
      // create the contract handler of etherjs
      console.log(typeof(contract_info.abi))
      console.log(typeof(contract_info.bytecode))
      // console.log(wallet_bob)
      const ExampleAPI = await hre.ethers.getContractFactory(contract_info.abi, contract_info.bytecode, wallet_bob);
      const fee = ethers.utils.parseEther(process.env.ORACLE_RINKEBY_FEE_1)
      const exampleAPI = await ExampleAPI.deploy(
            process.env.ORACLE_RINKEBY_ADDRESS_1,
            process.env.ORACLE_RINKEBY_JOB_ID_1,
            fee);
      await exampleAPI.deployed();
      console.log("ExampleAPI deployed to:", exampleAPI.address);
    });
  });
});