# Frontend package.json
{
  "name": "blockchain-product-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web3": "^4.0.0",
    "ipfs-http-client": "^60.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}

# Backend package.json
{
  "name": "blockchain-product-backend",
  "version": "1.0.0",
  "description": "Backend server for blockchain product tracking",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "ipfs-http-client": "^60.0.0",
    "ethers": "^6.7.0",
    "dotenv": "^16.3.1",
    "nft.storage": "^7.1.1"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}

# Smart Contracts package.json
{
  "name": "blockchain-product-contracts",
  "version": "1.0.0",
  "description": "Smart contracts for blockchain product tracking",
  "main": "index.js",
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.3"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^3.0.2",
    "hardhat": "^2.17.1"
  },
  "scripts": {
    "compile": "hardhat compile",
    "deploy": "hardhat run scripts/deploy.js --network localhost",
    "test": "hardhat test"
  }
}

# Hardhat config - hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545", // Ganache
      accounts: [
        "0xdecd09d82d8aa29657642cb7cb884c91278412c7950eae6a4f79686d2bb30018" // Replace with actual private key
      ]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};