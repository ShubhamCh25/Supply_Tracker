let contract;
import contractArtifact from "./artifacts/contracts/SupplyTracker.sol/SupplyTracker.json";

const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const abi = contractArtifact.abi;

async function connectContract() {
  if (window.ethereum) {
    await ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    contract = new ethers.Contract(contractAddress, abi, signer);
  } else {
    alert("Install MetaMask!");
  }
}

function chooseRole(role) {
  const formDiv = document.getElementById("form");
  formDiv.innerHTML = "";

  if (role === "manufacturer") {
    formDiv.innerHTML = `
      <h2>Manufacturer</h2>
      <input id="uri" placeholder="Product Metadata URI" />
      <button onclick="mint()">Mint Product</button>
    `;
  } else {
    formDiv.innerHTML = `
      <h2>Customer</h2>
      <input id="tokenId" placeholder="Token ID" />
      <button onclick="placeOrder()">Place Order</button>
    `;
  }
}

async function mint() {
  await connectContract();
  const uri = document.getElementById("uri").value;
  const tx = await contract.mintProduct(await contract.signer.getAddress(), uri);
  await tx.wait();
  alert("Product minted!");
}

async function placeOrder() {
  await connectContract();
  const tokenId = document.getElementById("tokenId").value;
  const tx = await contract.placeOrder(tokenId);
  await tx.wait();
  alert("Order placed!");
}
