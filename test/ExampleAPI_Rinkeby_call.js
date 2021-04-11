const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
require('dotenv').config({'path': '../.env'})

describe("TestOracle", function() {
  this.timeout(55000);
  describe("GetAPIQuote", () => {
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let contract_info = new Object()
    let ExampleAPI = new Object()
    it ("should create the walets contract", async () => {
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
      contract_info.address = fs.readFileSync("./test/ExampleAPI_contract_address.txt").toString()
      // console.log(contract_info)
      // let compiled = require(`./build/${process.argv[2]}.json`);
      // console.log({
      //   address: contract_info.address,
      //   abi: contract_info.abi
      // })

    });
    it ("should connect signer to contract", async function() {
      ExampleAPI = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_bob);
      const status = await ExampleAPI.currentPrice()
      console.log(status.toString())
    });
    it ("should transfer some link token from bob to contract", async () => {
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
        funded_amount = 1.0
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
    it ("should send the get-API quote contract", async function() {
          gasLimit = 300000
          console.log(ethers.utils.formatEther(gasLimit))
          const request = await ExampleAPI.requestEthereumPrice({
            gasPrice: ethers.utils.parseUnits('90.0', 'gwei'),
            gasLimit: gasLimit})
          const receipt = await request.wait();
          // console.log(receipt);
          const status = await ExampleAPI.currentPrice()
          console.log(status.toString())
    });
    it ("should wait for some time", async function() {
      setTimeout(() => {  console.log("10 Seconds are over!"); }, 20000);
    });
    it("it should get the new price quote", async function() {
      const status = await ExampleAPI.currentPrice()
      console.log(status.toString())
    });
  });
});