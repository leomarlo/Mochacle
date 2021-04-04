// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main(which_contract) {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  if (which_contract=="ExampleAPI") {
    const initial_oracle_address = '0xC361e04Aa8637FB12bf1bc6261D8160fb317d751'; //0x1006553C2856F55886c787AAC5899D2Bb6e4DcC6; //0x2f90A6D021db21e1B2A077c5a37B3C7E75D15b7e;
    const job_id = "f822043129b845f88b7552ae73f65bf6"
    const fee = hre.ethers.utils.parseEther("1.0");
    const APIcall = await hre.ethers.getContractFactory(which_contract);
    const api_call = await APIcall.deploy(initial_oracle_address, job_id, fee);
    await api_call.deployed();

    console.log("ExampleAPI deployed to:", api_call.address);
  }

  if (which_contract=="APIConsumer") {
    const APIcall = await hre.ethers.getContractFactory(which_contract);
    const api_call = await APIcall.deploy();
    await api_call.deployed();
    console.log("APIConsumer deployed to:", api_call.address);
  }
}

// const which_contract = "APIConsumer"
const which_contract = "ExampleAPI"
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main(which_contract)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
