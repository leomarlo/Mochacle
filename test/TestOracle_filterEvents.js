const { assert, expect } = require("chai");
const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const crypto = require('crypto');
require('dotenv').config({'path': '../.env'})

const contract_info = new Object()
const submission_id =  '0x' + 'd8660626d267694f81d9621025e535a7'

const Oracles = {
    Lighthouse1: {
        ORACLE_ADDRESS: "0x9257E0700b0ecbc83ff8C465d8E000fF88c0FEc7",
        JOBID: "63a9627cb5f848218dcd796b454a0032",
        ORACLE_PAYMENT: "0.1"
    },
    maralink: {
        ORACLE_ADDRESS: "0x3CE9f959d2961b7CE7f7C5AaBbA11fBCA23868a7",
        JOBID: "8e575929c4234d09b1ebab962cdd322a",
        ORACLE_PAYMENT: "0.1"
    },
    farore: {
        ORACLE_ADDRESS: "0xC361e04Aa8637FB12bf1bc6261D8160fb317d751",
        JOBID: "bf1628510d88465fae8ea7ffdbd923f7",
        ORACLE_PAYMENT: "1"
    }
}

async function check_events() {
    // get Rinkeby provider
    const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
    
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
 
    TestOracle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);
    
    // Try different oracle:

    const chOrc_tx = await TestOracle.changeOracle(
        Oracles.farore.ORACLE_ADDRESS,
        Oracles.farore.JOBID,
        ethers.utils.parseEther(Oracles.farore.ORACLE_PAYMENT))
    await chOrc_tx.wait()
    console.log("chOrc_tx", chOrc_tx)

    const oracle_address = await TestOracle.ORACLE_ADDRESS()
    console.log("oracle_address", oracle_address)
    const oracle_jobid = await TestOracle.JOBID()
    console.log("oracle_jobid", oracle_jobid)
    
    


    const checkScore_tx = await TestOracle.requestScore(
        submission_id,
        {gasLimit: 400000});
    // console.log("checkScore_tx", checkScore_tx)
    const checkScore_receipt = await checkScore_tx.wait()
    const all_checkScore_events = await checkScore_receipt.events
    return all_checkScore_events
    // return 'finished'
}

// check_events().then((re)=>console.log(re)).catch(err=>console.log(err))
async function check_testing_h(){
    // get Rinkeby provider
    const provider = new hre.ethers.providers.JsonRpcProvider(process.env.RINKEBY_URL);
    
    // create wallets for alice, bob and charlie
    wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
    // wallet_bob = new hre.ethers.Wallet(process.env.PRIVATE_KEY_BOB, provider);
    // wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
    
    // receive the abi and bytecode of the TestOracle contract
    res = await hre.artifacts.readArtifact("Testing_h")
    // get the interface of the TestOracle contract via its abi
    const ITesting_h = new ethers.utils.Interface(res.abi)
    contract_info.abi = ITesting_h.format()
    contract_info.bytecode = res.bytecode
    contract_info.address = "0xd459e6C159BfE489FDAAFEc25eB5acC0c3EE430a"
 
    const Testing_h = new hre.ethers.Contract(
        "0xd459e6C159BfE489FDAAFEc25eB5acC0c3EE430a",
        ITesting_h.format(),
        wallet_alice);
    
    const data = await Testing_h.data_answer();
    console.log(data)
    return (data)
}


check_testing_h().then((re)=>console.log(re)).catch(err=>console.log(err))
// check_testing_h