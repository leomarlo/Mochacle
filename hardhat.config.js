require("@nomiclabs/hardhat-waffle");
require('dotenv').config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.6.12",
  defaultNetwork: "kovan",
  networks: {
    kovan: {
      url: process.env.KOVAN_URL,
      accounts: [process.env.PRIVATE_KEY_ALICE, process.env.PRIVATE_KEY_BOB]
    },
    rinkeby: {
      url: process.env.RINKEBY_URL,
      accounts: [process.env.PRIVATE_KEY_ALICE, process.env.PRIVATE_KEY_BOB]
    },
    localhost: {
      url: process.env.LOCALHOST,
      accounts: [process.env.PRIVATE_KEY_ALICE, process.env.PRIVATE_KEY_BOB]
    }
  }
};

