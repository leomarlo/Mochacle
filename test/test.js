const { assert, expect } = require("chai");
const ethers = require("ethers");
// const {mocha} = require("mocha");
const hre = require("hardhat");

describe("Greeter", function() {
  this.timeout(55000);
  it("Should return the new greeting once it's changed", async function() {
    this.timeout(55000);
    const Greeter = await hre.ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    
    await greeter.deployed();
    expect(await greeter.greet()).to.equal("Hello, world!");

    // await greeter.setGreeting("Hola, mundo!");
    // expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
