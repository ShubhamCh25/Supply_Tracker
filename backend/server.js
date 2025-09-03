// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { NFTStorage, File } = require('nft.storage');
const { ethers } = require('ethers');

const app = express();
const port = 3001;

// ===== NFT.Storage setup =====
// 🔹 Insert your NFT.Storage API key here
const NFT_STORAGE_API_KEY = 'f764c6fc.9666c515e2bc400f81619655b9a2c297';
const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });
const MOCK_IPFS = false; // Set true only for testing

// Middleware
app.use(cors());
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ===== Blockchain setup (Ganache) =====
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Ganache
const privateKey = '0xdecd09d82d8aa29657642cb7cb884c91278412c7950eae6a4f79686d2bb30018'; // Ganache account
const signer = new ethers.Wallet(privateKey, provider);

// Contract addresses (your existing ones)
const contractAddresses = {
  ProductNFT: '0x9069341477CD0267e035984DD487b420463Bb527',
  ProductRegistry: '0x3A2B491B2130ce45943af88F47F4f79E0be7e5FA', 
  Tracking: '0x12A8B237f62c175BC397DEE5C34437Ee4ab24831'
};

// Contract ABIs (simplified)
const trackingABI = [
  "function addCheckpoint(uint256 tokenId, string memory step, string memory location) public",
  "function startTracking(uint256 tokenId, address customer) public",
  "event Checkpoint(uint256 indexed tokenId, string step, string location, uint256 timestamp, uint256 checkpointIndex)"
];

const productRegistryABI = [
  "function buyProduct(uint256 tokenId, address customerAddress) public"
];

// ===== Upload Image & Metadata to NFT.Storage =====
app.post('/upload-nft', upload.single('image'), async (req, res) => {
  try {
    const { title, location } = req.body;
    if (!req.file || !title || !location) {
      return res.status(400).json({ error: 'Image, title, and location are required' });
    }

    let imageCID, metadataCID;

    if (MOCK_IPFS) {
      // Mock IPFS for testing
      imageCID = 'QmMockImage' + Date.now() + Math.random().toString(36).substr(2, 9);
      metadataCID = 'QmMockMetadata' + Date.now() + Math.random().toString(36).substr(2, 9);
      console.log('MOCK IPFS:', { imageCID, metadataCID });
    } else {
      // ===== Real NFT.Storage Upload =====
      const imageFile = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype
      });
      imageCID = await nftStorage.storeBlob(imageFile);
      console.log('Image uploaded. CID:', imageCID);

      const metadata = {
        name: title,
        description: `Product manufactured in ${location}`,
        image: `ipfs://${imageCID}`,
        attributes: [
          { trait_type: 'Manufacturing Location', value: location },
          { trait_type: 'Created At', value: new Date().toISOString() }
        ]
      };

      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', {
        type: 'application/json'
      });

      metadataCID = await nftStorage.storeBlob(metadataFile);
      console.log('Metadata uploaded. CID:', metadataCID);
    }

    res.json({ success: true, imageCID, metadataCID });
  } catch (error) {
    console.error('Error uploading NFT:', error);
    res.status(500).json({ error: 'Failed to upload NFT' });
  }
});

// ===== Start Product Journey =====
app.post('/start-journey', async (req, res) => {
  try {
    const { tokenId, customerAddress, customerLocation } = req.body;

    console.log(`Starting journey for product ${tokenId} to ${customerAddress}`);

    const trackingContract = new ethers.Contract(contractAddresses.Tracking, trackingABI, signer);
    const registryContract = new ethers.Contract(contractAddresses.ProductRegistry, productRegistryABI, signer);

    await trackingContract.startTracking(tokenId, customerAddress);

    const steps = [
      { step: 'Manufactured', location: 'Manufacturing Facility' },
      { step: 'Dispatched', location: 'Distribution Center' },
      { step: 'In Transit', location: 'Highway Hub' },
      { step: 'Out for Delivery', location: 'Local Delivery Center' },
      { step: 'Delivered', location: customerLocation }
    ];

    let currentStep = 0;

    const interval = setInterval(async () => {
      try {
        if (currentStep >= steps.length) {
          clearInterval(interval);
          await registryContract.buyProduct(tokenId, customerAddress);
          console.log(`Product ${tokenId} delivered`);
          return;
        }

        const { step, location } = steps[currentStep];
        console.log(`Checkpoint: ${step} at ${location} for product ${tokenId}`);
        await trackingContract.addCheckpoint(tokenId, step, location);
        currentStep++;
      } catch (error) {
        console.error('Error adding checkpoint:', error);
        clearInterval(interval);
      }
    }, 10000);

    res.json({ success: true, message: 'Journey started', steps: steps.length });
  } catch (error) {
    console.error('Error starting journey:', error);
    res.status(500).json({ error: 'Failed to start journey' });
  }
});

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log('✅ Set your NFT.Storage API key in NFT_STORAGE_API_KEY variable');
});
