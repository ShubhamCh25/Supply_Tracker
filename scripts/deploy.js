const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying contracts...");

  // Deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // --- Deploy ProductNFT ---
  const ProductNFT = await ethers.getContractFactory("ProductNFT");
  const productNFT = await ProductNFT.deploy();
  await productNFT.waitForDeployment();
  console.log("✅ ProductNFT deployed at:", await productNFT.getAddress());

  // --- Deploy ProductRegistry ---
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(await productNFT.getAddress());
  await productRegistry.waitForDeployment();
  console.log("✅ ProductRegistry deployed at:", await productRegistry.getAddress());

  // --- Deploy Tracking ---
  const Tracking = await ethers.getContractFactory("Tracking");
  const tracking = await Tracking.deploy();
  await tracking.waitForDeployment();
  console.log("✅ Tracking deployed at:", await tracking.getAddress());

  // --- Save contract addresses ---
  const addresses = {
    ProductNFT: await productNFT.getAddress(),
    ProductRegistry: await productRegistry.getAddress(),
    Tracking: await tracking.getAddress(),
  };

  fs.writeFileSync(
    "./frontend/src/contracts/addresses.json",
    JSON.stringify(addresses, null, 2)
  );

  // --- Save ABIs ---
  const artifacts = [
    { name: "ProductNFT", factory: ProductNFT },
    { name: "ProductRegistry", factory: ProductRegistry },
    { name: "Tracking", factory: Tracking },
  ];

  artifacts.forEach(({ name, factory }) => {
    fs.writeFileSync(
      `./frontend/src/contracts/${name}.json`,
      JSON.stringify(factory.interface.formatJson(), null, 2)
    );
  });

  console.log("\n📦 Contracts & ABIs saved to frontend/src/contracts/");
  console.log("\n✅ Deployment completed successfully!");
  console.log("\n👉 Next steps:");
  console.log("1. Start Hardhat node: npx hardhat node");
  console.log("2. Deploy: npx hardhat run scripts/deploy.js --network localhost");
  console.log("3. Start frontend: cd frontend && npm start");
  console.log("4. Start backend: cd backend && npm start");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
