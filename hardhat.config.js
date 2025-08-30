require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",  // Ganache Desktop RPC
      accounts: [
        "0xdecd09d82d8aa29657642cb7cb884c91278412c7950eae6a4f79686d2bb30018"
      ]
    }
  }
};
