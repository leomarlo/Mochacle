const { assert, expect } = require("chai");


describe("Greeter", function() {
  this.timeout(45000);
  it("Should return the new greeting once it's changed", async function() {
    this.timeout(45000);
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    
    await greeter.deployed();
    expect(await greeter.greet()).to.equal("Hello, world!");

    await greeter.setGreeting("Hola, mundo!");
    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
