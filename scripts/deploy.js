const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting deployment...");

  // --- Deployer Account ---
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer Account:", deployer.address);

  // --- Deploy ProductNFT ---
  console.log("\n⏳ Deploying ProductNFT...");
  const ProductNFT = await ethers.getContractFactory("ProductNFT");
  const productNFT = await ProductNFT.deploy();
  await productNFT.waitForDeployment();
  const productNFTAddress = await productNFT.getAddress();
  console.log("✅ ProductNFT deployed at:", productNFTAddress);

  // --- Deploy ProductRegistry ---
  console.log("\n⏳ Deploying ProductRegistry...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(productNFTAddress);
  await productRegistry.waitForDeployment();
  const productRegistryAddress = await productRegistry.getAddress();
  console.log("✅ ProductRegistry deployed at:", productRegistryAddress);

  // --- Deploy Tracking ---
  console.log("\n⏳ Deploying Tracking...");
  const Tracking = await ethers.getContractFactory("Tracking");
  const tracking = await Tracking.deploy();
  await tracking.waitForDeployment();
  const trackingAddress = await tracking.getAddress();
  console.log("✅ Tracking deployed at:", trackingAddress);

  // --- Save Addresses ---
  const addresses = {
    ProductNFT: productNFTAddress,
    ProductRegistry: productRegistryAddress,
    Tracking: trackingAddress,
  };

  const addressPath = "./frontend/src/contracts/addresses.json";
  fs.writeFileSync(addressPath, JSON.stringify(addresses, null, 2));
  console.log(`\n📦 Contract addresses saved to ${addressPath}`);

  // --- Save ABIs ---
  const artifactData = [
    { name: "ProductNFT", factory: ProductNFT },
    { name: "ProductRegistry", factory: ProductRegistry },
    { name: "Tracking", factory: Tracking },
  ];

  artifactData.forEach(({ name, factory }) => {
    const abiPath = `./frontend/src/contracts/${name}.json`;
    fs.writeFileSync(abiPath, JSON.stringify(factory.interface.formatJson(), null, 2));
    console.log(`📄 ABI saved for ${name} at ${abiPath}`);
  });

  console.log("\n✅ Deployment completed successfully!");
  console.log("👉 Next Steps:");
  console.log("   - For Hardhat Node: npx hardhat run scripts/deploy.js --network localhost");
  console.log("   - For Ganache:      npx hardhat run scripts/deploy.js --network ganache");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
