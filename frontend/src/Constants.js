// src/Constants.js

import { PinataSDK } from 'pinata';

// NOTE: Replace with your actual Pinata JWT and ensure it is valid
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3YjZmNmY2NS1iODE3LTRjZWItOGQzOC0xMmI1ZmY2NWFmN2MiLCJlbWFpbCI6InNodTI1Y2hAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjZlYTAzMWI1MDFjMDdkNDczOTRlIiwic2NvcGVkS2V5U2VjcmV0IjoiZDk1ZDdlMjY2YTgxMWNiZDZiN2ZlNTMzZmJiNGRlOTY4YTE3ZGU5YmVjMzIwNTczYTVhODkzY2RhNTU1MzBlMSIsImV4cCI6MTc4ODY4MjYxNn0.vBexkjCVGPrpe88-WgRhDzRHU7ljqemJf4hpzhjF56c"; 
export const PINATA_GATEWAY = "amethyst-tremendous-lamprey-430.mypinata.cloud";

export const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY
});

// Ganache Configuration
export const GANACHE_URL = 'http://127.0.0.1:8545';
export const GANACHE_CHAIN_ID = '0x539'; 

// Constants.js

// NOTE: You must have defined PINATA_JWT and PINATA_GATEWAY elsewhere (e.g., environment variables)
// if PinataSDK is imported and used here. Assuming they are defined.
// import PinataSDK from '@pinata/sdk'; // Assuming this line is in the actual file but omitted


// Contract Addresses (Update these after re-deployment if you recompile)
export const CONTRACT_ADDRESSES = {
  ProductNFT: '0xd9Bee42a6d8e6Da5ebBAF5250bBf3a0c5F056Bb7',     
  // 🐛 FIX: Removed the extra leading '0' to make it a valid '0x' address
  ProductRegistry: '0x66e17B2766D9944F707a4C459aAcAa49e9f6a57C', 
  Tracking: '0x657DA6cb89326ABe1361D5E42fDCe22DB522dAD8'        
};

// ABIs (No changes needed, they are structurally correct)
export const PRODUCT_NFT_ABI = [
  // ERC721 Standard Functions
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",

  // Custom Functions
  "function mintProduct(string memory metadataCID) public returns (uint256)",
  "function transferProduct(uint256 tokenId, address to) public",
  "function getManufacturer(uint256 tokenId) public view returns (address)",
  
  // ✅ --- THIS WAS THE MISSING LINE ---
  "function updateTokenURI(uint256 tokenId, string memory newCID) public",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  "event ProductMinted(uint256 indexed tokenId, address indexed manufacturer, string metadataCID)",
  "event TokenURIUpdated(uint256 indexed tokenId, string oldURI, string newURI)" // Also good to add the event
];

// This ABI looks correct
export const PRODUCT_REGISTRY_ABI = [
  "function registerProduct(uint256 tokenId) public",
  "function removeProduct(uint256 tokenId) public",
  "function getAvailableProducts() public view returns (uint256[] memory)",
  "function getProductsByOwner(address owner) public view returns (uint256[] memory)", 
  "function buyProduct(uint256 tokenId) public",
  "function getProduct(uint256 tokenId) public view returns (tuple(uint256 tokenId, address manufacturer, bool available, uint256 listedAt))",
  "event ProductRegistered(uint256 indexed tokenId, address indexed manufacturer)",
  "event ProductRemoved(uint256 indexed tokenId)",
  "event ProductPurchased(uint256 indexed tokenId, address indexed buyer, address indexed manufacturer)"
];

// This ABI is for a contract not yet used, but looks fine
export const TRACKING_ABI = [
  "function startTracking(uint256 tokenId, address customer) public",
  "function addCheckpoint(uint256 tokenId, string memory step, string memory location) public",
  "function getTrackingHistory(uint256 tokenId) public view returns (tuple(uint256 tokenId, string step, string location, uint256 timestamp)[] memory)",
  "function getLatestCheckpoint(uint256 tokenId) public view returns (tuple(uint256 tokenId, string step, string location, uint256 timestamp))",
  "function isProductTracking(uint256 tokenId) public view returns (bool)",
  "event TrackingStarted(uint256 indexed tokenId, address indexed customer)",
  "event Checkpoint(uint256 indexed tokenId, string step, string location, uint256 timestamp, uint256 checkpointIndex)",
  "event TrackingCompleted(uint256 indexed tokenId)"
];
export const ConnectionStatus = ({ status }) => (
  <div className={`px-3 py-1 rounded-full text-sm font-medium ${ // Added font-medium
    status === 'connected' ? 'bg-green-100 text-green-800' :
    status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  }`}>
    {status === 'connected' ? '🟢 Connected to Ganache' :
     status === 'connecting' ? '🟡 Connecting...' :
     status === 'denied' ? '🔴 Connection Denied' : // Added status for denial
     status === 'no-metamask' ? '🔴 No MetaMask' : // Added status for no-metamask
     '🔴 Disconnected'}
  </div>
);

export const uploadToPinata = async (file) => {
  if (!file) throw new Error("No file provided");

  try {
    const upload = await pinata.upload.public.file(file);
    if (upload.cid) {
      const ipfsLink = await pinata.gateways.public.convert(upload.cid);
      return { cid: upload.cid, url: ipfsLink };
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
};

export const uploadMetadatatoPinata = async (metadata) => {
  try {
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const upload = await pinata.upload.public.file(metadataBlob);

    if (upload.cid) {
      const ipfsLink = await pinata.gateways.public.convert(upload.cid);
      return { cid: upload.cid, url: ipfsLink };
    } else {
      throw new Error("Metadata upload failed");
    }
  } catch (error) {
    console.error("Metadata upload error:", error);
    throw error;
  }
};