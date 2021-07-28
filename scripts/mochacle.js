const fs = require("fs");
const ethers = require("ethers");
const hre = require("hardhat");
const {get_network_info} = require("../utilities/networks.js")
const crypto = require('crypto');

const {submitTest, submitSolution, runSubmission} = require("../utilities/submission.js");
const { mainModule } = require("process");

require('dotenv').config({'path': '../.env'})

let address_alice = process.env.ADDRESS_ALICE
let address_charlie = process.env.ADDRESS_CHARLIE

let contract_info = new Object()
let submissionObj = new Object()

let network_name = hre.network.name
let this_network = get_network_info(network_name)
let current_network = this_network.current_network
let provider_url = this_network.provider_url
const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
// console.log('provider', provider)
let contract_address_filename = this_network.contract_address_filename


const wallet_charlie = new hre.ethers.Wallet(process.env.PRIVATE_KEY_CHARLIE, provider);
const wallet_alice = new ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);
const passwords = new Object()
passwords["alice"] = address_alice.slice(-10,) //process.env.ALICE_NEW_TOKEN
passwords["charlie"] = address_charlie.slice(-10,) //process.env.CHARLIE_NEW_TOKEN



async function getContractInfo(contract_address_filename) {

    res = await hre.artifacts.readArtifact("Mochacle")
    let temp_contract_info = new Object()
    // get the interface of the TestOracle contract via its abi
    const ITestOracle = new ethers.utils.Interface(res.abi)
    temp_contract_info.abi = ITestOracle.format()
    temp_contract_info.bytecode = res.bytecode
    temp_contract_info.address = fs.readFileSync(contract_address_filename).toString()
    return temp_contract_info
}

async function testSubmission(server_flag, chain_flag) {
    contract_info = await getContractInfo(contract_address_filename)
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

    CharlieMochacle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_charlie);
    
    const score_factor_pre_format = await CharlieMochacle.SCORE_FACTOR();
    const score_factor = Math.floor(ethers.utils.formatUnits(score_factor_pre_format, 0))
    console.log('score_factor', score_factor)
    
    const cblc = await wallet_charlie.getBalance();
    const ablc = await wallet_alice.getBalance();
    console.log('balance charlie', ethers.utils.formatEther(cblc))
    console.log('balance alice', ethers.utils.formatEther(ablc))
    
    let transaction_hash = ''
    let transaction_url = ''

    if (chain_flag) {
        const submitTest_tx = await CharlieMochacle.submitTest(
            submissionObj.submit_test_id,
            submissionObj.submit_mocha_test_bytes20,
            Math.round(submissionObj.pass_fraction * score_factor),
            {value: ethers.utils.parseEther("0.005"), gasLimit: 4000000});
    
        // console.log('submitTest_tx', submitTest_tx)
        const submitTest_receipt = await submitTest_tx.wait();
        // console.log('submitTest_receipt', submitTest_receipt)
    
        transaction_hash = submitTest_receipt.transactionHash
        transaction_url = this_network.explorerURL  + 'tx/' + submitTest_receipt.transactionHash
        
        console.log(transaction_url)
    } else {

        transaction_hash = ''
        transaction_url = this_network.explorerURL  + 'tx/' + ''
    }
    

    const packages_required = {
            'fs': '1.1.1',
            'random': '1.1.1'}

    if (server_flag) {
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
    }
    

    return test_id
}


async function solutionSubmission(test_id, server_flag, chain_flag) {
    contract_info = await getContractInfo(contract_address_filename)

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


    const AliceMochacle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);

    
    let transaction_hash = ''
    let transaction_url = ''

    if (chain_flag) {
        const submitSolution_tx_alice = await AliceMochacle.submitSolution(
            '0x' + test_id,
            submissionObj.submit_solution_11_id,
            submissionObj.submit_solution_11_script_hash,
            {gasLimit: 4000000})
    
        const submitSolution_receipt_alice = await submitSolution_tx_alice.wait()
        
        transaction_hash = submitSolution_receipt_alice.transactionHash
        transaction_url = this_network.explorerURL  + 'tx/' + transaction_hash
    
        console.log('transaction_url', transaction_url) 

    } else {
        transaction_hash = ''
        transaction_url = this_network.explorerURL  + 'tx/' + ''
    }

    if (server_flag){
        const pr = await submitSolution(
            process.env.ADDRESS_ALICE,
            passwords['alice'],
            solution_script_string,
            test_id,
            solution_11_id,
            current_network.chain_name,
            current_network.chain_id,
            packages_required,
            transaction_hash,
            transaction_url)
        console.log(pr.status)
    }

    return solution_11_id
}



async function runSolution(solution_id) {
    const pr = await runSubmission(
        process.env.ADDRESS_CHARLIE,
        passwords['charlie'],
        solution_id)
    console.log(pr)
}



async function requestScore(solution_id) {

    contract_info = await getContractInfo(contract_address_filename)

    CharlieMochacle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_charlie);
    
    const checkScore_tx = await CharlieMochacle.requestScore(
        '0x' +  solution_id,
        {gasLimit: 4000000});
        // console.log("checkScore_tx", checkScore_tx)
    const checkScore_receipt = await checkScore_tx.wait()

    console.log("checkScore_receipt:", checkScore_receipt);
    
}


async function main(runAll) {

    let test_id = ''
    let solution_id = ''

    // test submission
    test_server_flag = true
    test_chain_flag = true
    try {
        test_id = await testSubmission(test_server_flag, test_chain_flag);
        console.log("test submission: success! id:", test_id)
    } catch (err) {
        console.log(err.toString())
        return false
    }

    // solution submission
    solution_server_flag = true
    solution_chain_flag = true
    try {
        solution_id = await solutionSubmission(test_id, solution_server_flag, solution_chain_flag);
        console.log("solution submission: success! id:", solution_id)
    } catch (err) {
        console.log(err.toString())
        return false
    }

    // run solution
    try {
        await runSolution(solution_id);
        console.log("run solution: success! id:", solution_id)
    } catch (err) {
        console.log(err.toString())
        return false
    }

    if (!runAll) {
        return true
    }

    // request score
    try {
        await requestScore(solution_id);
        console.log("request score: success! id:", solution_id)
    } catch (err) {
        console.log(err.toString())
        return false
    }
    return true
}


const runIncludingRequestScore = true
main(runIncludingRequestScore)
    .then((res) => {console.log("Everything Successfull: ", res.toString())})
    .catch((err)=> {console.log(err.toString())})

