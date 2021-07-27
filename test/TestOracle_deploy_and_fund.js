const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const {get_network_info} = require("../utilities/networks.js")

require('dotenv').config({'path': '../.env'})

// PROVIDER URL KOVAN OR RINKEBY
let network_name = hre.network.name
let this_network = get_network_info(network_name)
let provider_url = this_network.provider_url
let link_contract_address = this_network.link_contract_address
let oracle_file = this_network.oracle_file

// set API_URL of the contract
let API_URL = ''
if (process.env.REMOTE==1) {
  API_URL = process.env.SERVERHOST_DOCKER_REMOTE
} else {
  API_URL = (process.env.INSIDE_DOCKER ? process.env.SERVERHOST_DOCKER_LOCAL : process.env.SERVERHOST_LOCAL)
}


describe("Mochacle", function() {
  this.timeout(55000);
  describe("Deployment", () => {
    let wallet_alice = new Object()
    let wallet_bob = new Object()
    let wallet_charlie = new Object()
    let contract_info = new Object()

    it ("should initialize provider and wallet", async () => {
      const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
      wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
      wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
      wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
      // console.log(wallet_bob)
      // let bl = await wallet_alice.getBalance()
      // console.log(ethers.utils.formatEther(bl))
      res = await hre.artifacts.readArtifact("Mochacle")
      const ITestOracles = new ethers.utils.Interface(res.abi)
      // console.log(IExampleAPIs.format())


      contract_info.abi = ITestOracles.format()
      const contract_abi = JSON.stringify(contract_info.abi, null, 4);

      // write JSON string to a file
      fs.writeFile('./app/contracts/interfaces/TestOracle.json', contract_abi, (err) => {
          if (err) {throw err}
          console.log("JSONified ABI is saved.")});

      contract_info.bytecode = res.bytecode
      // console.log(contract_info)
      // let compiled = require(`./build/${process.argv[2]}.json`);

    });
    it ("should deploy the TestOracle contract", async function() {
      const TestOracle = await hre.ethers.getContractFactory(
        contract_info.abi,
        contract_info.bytecode,
        wallet_alice);
      // const fee = ethers.utils.parseEther(process.env.ORACLE_RINKEBY_FEE_1)
      const testOracle_receipt = await TestOracle.deploy(API_URL + '/submission_ids/');
      await testOracle_receipt.deployed();
      contract_info.address = testOracle_receipt.address;
      contract_info.current_network = wallet_alice.provider.network.name
      console.log('The contract address is:', contract_info.address)
      console.log('The network name is:', contract_info.current_network)
    });
    it("should save the contract address to file", () => {
      // fs.writeFileSync('./test/TestOracle_contract_address.txt', contract_info.address)
      fs.writeFileSync('./app/contracts/addresses/TestOracle_' + contract_info.current_network + '.txt', contract_info.address)
    });
    it ("Alice should set the oracle address", async ()=>{
      const TestOracle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
      let ORACLES_RAW = fs.readFileSync(oracle_file);
      let ORACLES_ARRAY = JSON.parse(ORACLES_RAW);
      let etherDecimals = 18 - ORACLES_ARRAY[0].fee_decimals;
      let etherFee = ORACLES_ARRAY[0].fee_value * (10 ** etherDecimals)
      const setOracle_tx = await TestOracle.setOracle(
        ORACLES_ARRAY[0].address,
        ORACLES_ARRAY[0].job,
        ethers.utils.parseEther(etherFee.toString()) )
      const setOracle_receipt = await setOracle_tx.wait()
      // console.log(setOracle_receipt)
    });

    it ("should transfer some link token from alice to contract", async () => {
        const LINK_ADDRESS = link_contract_address
        let LINK_ABI_RAW = fs.readFileSync('./app/contracts/interfaces/LINK.json');
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
          funded_amount = 0.2
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