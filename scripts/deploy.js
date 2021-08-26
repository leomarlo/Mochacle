const ethers = require("ethers");
const hre = require("hardhat");
const fs = require("fs")
const {get_network_info} = require("../utilities/networks.js")

require('dotenv').config({'path': '../.env'})


async function main(fundWithLINK){

    // KOVAN OR RINKEBY
    let network_name = hre.network.name

    // get network info from this function
    let this_network = get_network_info(network_name)
    let provider_url = this_network.provider_url
    let link_contract_address = this_network.link_contract_address
    let oracle_file = this_network.oracle_file

    // set API_URL for get-requests in the contract
    let API_URL = process.env.SERVERHOST_DOCKER_REMOTE
    const provider = new hre.ethers.providers.JsonRpcProvider(provider_url);
    const wallet_alice = new hre.ethers.Wallet(process.env.PRIVATE_KEY_ALICE, provider);


    let contract_info = new Object()
    mochacleArtifact = await hre.artifacts.readArtifact("Mochacle")
    const IMochacle = new ethers.utils.Interface(mochacleArtifact.abi)
    contract_info.abi = IMochacle.format()
    const contract_abi = JSON.stringify(contract_info.abi, null, 4);
    contract_info.bytecode = mochacleArtifact.bytecode

    // write JSON string to a file
    fs.writeFile('./dapp/contracts/interfaces/Mochacle.json', contract_abi, (err) => {
        if (err) {throw err}
        console.log("JSONified ABI is saved.")});

    // create contract object
    const MochacleFactory = await hre.ethers.getContractFactory(
        contract_info.abi,
        contract_info.bytecode,
        wallet_alice);

    // deploy Mochacle contract
    const mochacle_receipt = await MochacleFactory.deploy(API_URL + '/submission_ids/');
    await mochacle_receipt.deployed();
    contract_info.address = mochacle_receipt.address;
    contract_info.current_network = wallet_alice.provider.network.name
    console.log('The contract address is:', contract_info.address)
    console.log('The network name is:', contract_info.current_network)

    // save contract address to file
    fs.writeFileSync('./dapp/contracts/addresses/Mochacle_' + contract_info.current_network + '.txt', contract_info.address)

    // create ethers js contract api again
    const Mochacle = new ethers.Contract(
        contract_info.address,
        contract_info.abi,
        wallet_alice);

    // get oracles from json file
    let ORACLES_RAW = fs.readFileSync(oracle_file);
    let ORACLES_ARRAY = JSON.parse(ORACLES_RAW);

    // just use the first oracle in the list for now
    let etherDecimals = 18 - ORACLES_ARRAY[0].fee_decimals;
    let etherFee = ORACLES_ARRAY[0].fee_value * (10 ** etherDecimals)
    const setOracle_tx = await Mochacle.setOracle(
        ORACLES_ARRAY[0].address,
        ORACLES_ARRAY[0].job,
        ethers.utils.parseEther(etherFee.toString()) )
    const setOracle_receipt = await setOracle_tx.wait()

    if (fundWithLINK){
        const LINK_ADDRESS = link_contract_address
        let LINK_ABI_RAW = fs.readFileSync('./dapp/contracts/interfaces/LINK.json');
        let LINK_ABI = JSON.parse(LINK_ABI_RAW);
        // create the link contract Object
        const LINKcontract = new ethers.Contract(
            LINK_ADDRESS,
            LINK_ABI,
            wallet_alice);
        
        funded_amount = 0.2
        const amount_string = parseFloat(funded_amount).toString()
        let receipt_transfer = await LINKcontract.transfer(
        contract_info.address,
        ethers.utils.parseEther(amount_string));
        await receipt_transfer.wait()
        const new_balance = await LINKcontract.balanceOf(contract_info.address);
        console.log('LINK balance of the contract is ', new_balance.toString())
    }

}

// if Alice has LINK, then fund contract with ALICEs LINK
const fundWithLINK = true
main(fundWithLINK)
   .then(()=>{console.log("successful")})
   .catch(console.log)