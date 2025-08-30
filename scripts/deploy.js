async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with:", deployer.address);
  
    const SupplyTracker = await ethers.getContractFactory("SupplyTracker");
    const supplyTracker = await SupplyTracker.deploy();
  
    await supplyTracker.waitForDeployment(); // ✅ new way
  
    console.log("SupplyTracker deployed to:", await supplyTracker.getAddress());
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  