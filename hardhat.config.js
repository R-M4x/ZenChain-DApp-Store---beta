require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    zenchain: {
      url: "https://zenchain-testnet.api.onfinality.io/public",
      chainId: 8408,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 8000000000, // 8 gwei
    },
  },
  etherscan: {
    apiKey: {
      zenchain: "ur-zentrace-api-key-here"
    },
    customChains: [
      {
        network: "zenchain",
        chainId: 8408,
        urls: {
          apiURL: "https://zentrace.io/api",
          browserURL: "https://zentrace.io"
        }
      }
    ]
  }
};