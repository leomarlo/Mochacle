const fs = require("fs");
const ethers = require("ethers");
const hre = require("hardhat");
const {get_network_info} = require("../utilities/networks.js")
const crypto = require('crypto');
const {submitTest, submitSolution, runSubmission} = require("../utilities/submission.js");

require('dotenv').config({'path': '../.env'})

let contract_info = new Object()
let submissionObj = new Object()


// Create Wallet 
let network_name = hre.network.name
let this_network = get_network_info(network_name)
let current_network = this_network.current_network
let provider_url = this_network.provider_url
const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
let contract_address_filename = this_network.contract_address_filename
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);



async function getContractInfo() {
    res = await hre.artifacts.readArtifact("Problem")
    let temp_contract_info = new Object()
    // get the interface of the TestOracle contract via its abi
    const ITestOracle = new ethers.utils.Interface(res.abi)
    temp_contract_info.abi = ITestOracle.format()
    temp_contract_info.bytecode = res.bytecode
    temp_contract_info.address = fs.readFileSync('./app/contracts/addresses/Problem_kovan.txt').toString()
    return temp_contract_info
}


async function requestScore() {

    contract_info = await getContractInfo(contract_address_filename)

    const Problem = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet);
    
    console.log('contract_info.address', contract_info.address)
    const checkScore_tx = await Problem.requestScore(
        {gasLimit: 4000000});
    const checkScore_receipt = await checkScore_tx.wait()

    console.log("checkScore_receipt:", checkScore_receipt);
    
}


const submission_id = '0x3cbbca3cf40db491530b29f24ba5abed'
requestScore()
    .then(() => {console.log("Everything Successfull: ")})
    .catch((err)=> {console.log(err.toString())})

