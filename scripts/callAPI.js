const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config()

const testing_flag = true;
const which_contract = "ExampleAPI"
const json_raw = fs.readFileSync(`artifacts/contracts/${which_contract}.sol/${which_contract}.json`)
const json_parsed = JSON.parse(json_raw);
// const APIConsumer = fs.readFileSync('artifacts/contracts/APIConsumer.sol/APIConsumer.json')
// // const TokenArtifacts = require('../artifacts/contracts/APIConsumer.json');
const abi = json_parsed.abi;
let contract_address = '';
if (which_contract == "ExampleAPI") {
    contract_address = process.env.EXAMPLEAPI_CONTRACT_ADDRESS;
}
if (which_contract == "APIConsumer") {
    contract_address = process.env.APICONSUMER_CONTRACT_ADDRESS; // process.env.APICONSUMER_CONTRACT_ADDRESS;
}

// const provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');
// const provider = new hre.ethers.providers.JsonRpcProvider(process.env.KOVAN_URL);
const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
// const signer = wallet.getSigner
const contract = new hre.ethers.Contract(contract_address, abi, wallet);

wallet.provider.getBalance(wallet.address).then((data) => {console.log(hre.ethers.utils.formatEther(data.toString()))});
// console.log(Object.keys(contract))

console.log(contract.address)

async function requestData() {
    const request = await contract.requestVolumeData({gasPrice: 10000000000, gasLimit: 185000})
    const receipt = await request.wait();
    console.log(receipt);
    const status = await contract.current_status()
    console.log(status)
}

async function requestDataExample() {
    const request = await contract.requestEthereumPrice({gasPrice: 100000000000, gasLimit: 185000})
    const receipt = await request.wait();
    console.log(receipt);
    const status = await contract.currentPrice()
    console.log(status)
}



async function testing() {
    const number = await contract.some_number()
    console.log(number.toString())
    const request = await contract.test(10)
    const receipt = await request.wait();
    console.log(receipt);

    const number2 = await contract.some_number()
    console.log(number2.toString())
    
}

async function changeOracle(){
    let new_oracle_address = '0x1006553C2856F55886c787AAC5899D2Bb6e4DcC6'; //0x1006553C2856F55886c787AAC5899D2Bb6e4DcC6; //0x2f90A6D021db21e1B2A077c5a37B3C7E75D15b7e;
    let job_id = "50517a452bb34385981ba29c9dba5df3"
    let fee = hre.ethers.utils.parseEther("0.1");
    new_oracle_address = "0x29CE4C76e6aaA0670751290AC167eeF4B1c6F3E3"
    job_id = "90624339fabd4c64bbbcf37a007a423e"
    fee = hre.ethers.utils.parseEther("0.05");

    new_oracle_address = "0x56dd6586DB0D08c6Ce7B2f2805af28616E082455"
    job_id = "b6602d14e4734c49a5e1ce19d45a4632"
    fee = hre.ethers.utils.parseEther("0.1");

    new_oracle_address = "0x3A56aE4a2831C3d3514b5D7Af5578E45eBDb7a40"
    job_id="3b7ca0d48c7a4b2da9268456665d11ae"
    fee = hre.ethers.utils.parseEther("0.01");
    const change = await contract.change_oracle(new_oracle_address, job_id, fee);
    const receipt = await change.wait();
    console.log(receipt)
    const new_job_id = await contract.JOBID();
    console.log(new_job_id)
}


if (testing_flag) {

    if (which_contract == "ExampleAPI") {
        contract.currentPrice().then(res => {
            console.log('get the currentPrice')
            console.log(res.toString())
        })
        contract.deployer_name().then(res => {
            console.log('get the deployername')
            console.log(res.toString())
        })

    }
    if (which_contract == "APIConsumer") {
        console.log('get the current_status')
        contract.current_status().then(res => {console.log(res.toString())})
    }

    // changeOracle()
    // .then(() => process.exit(0))
    // .catch(error => {
    //     console.error(error);
    //     process.exit(1);
    // });
}
else{
    // // We recommend this pattern to be able to use async/await everywhere
    // // and properly handle errors.
    requestDataExample()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
}

