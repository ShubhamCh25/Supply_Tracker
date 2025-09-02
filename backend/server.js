const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { create } = require('ipfs-http-client');
const { ethers } = require('ethers');

const app = express();
const port = 3001;

// IPFS client setup
const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: 'Basic ' + Buffer.from('BNK7eaRfkaYYkA8zcm9f2VWCxTLeT0miSBYLaY9W6Fqvv504JcZbyTCsxIkB78bxJd3tPORp_DOacA1Qle2PWLw:977592711d8bd7859f1083d0de2ffaf3a347736077b1db7f7b7b5420cf064d73 ').toString('base64')
    }
});

// Alternative: Use nft.storage (uncomment if preferred)
// const { NFTStorage, File } = require('nft.storage');
// const nftStorage = new NFTStorage({ token: 'YOUR_NFT_STORAGE_API_KEY' });

// Middleware
app.use(cors());
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Blockchain setup
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Ganache
const privateKey = '0xdecd09d82d8aa29657642cb7cb884c91278412c7950eae6a4f79686d2bb30018'; // Replace with actual key
const signer = new ethers.Wallet(privateKey, provider);

// Contract addresses (will be updated after deployment)
const contractAddresses = {
    ProductNFT: '0x3e964A10Ce73c29E1000D3Ab4fB261446Ab432f5', // Update after deployment
    ProductRegistry: '0xfcA57977932E7d43088cE5EC5d61cc7279d232b9', // Update after deployment
    Tracking: '0x5199f5D38e891aEff741e618dcbc50d4B737587B' // Update after deployment
};

// Contract ABIs (simplified for demo)
const trackingABI = [
    "function addCheckpoint(uint256 tokenId, string memory step, string memory location) public",
    "function startTracking(uint256 tokenId, address customer) public",
    "event Checkpoint(uint256 indexed tokenId, string step, string location, uint256 timestamp, uint256 checkpointIndex)"
];

const productRegistryABI = [
    "function buyProduct(uint256 tokenId, address customerAddress) public"
];

// Upload image to IPFS
app.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Upload to IPFS
        const result = await ipfs.add(req.file.buffer);
        const imageCID = result.path;

        res.json({ imageCID });
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Upload metadata to IPFS
app.post('/upload-metadata', async (req, res) => {
    try {
        const { title, location, imageCID } = req.body;
        
        const metadata = {
            name: title,
            description: `Product manufactured in ${location}`,
            image: `ipfs://${imageCID}`,
            attributes: [
                {
                    trait_type: "Manufacturing Location",
                    value: location
                },
                {
                    trait_type: "Created At",
                    value: new Date().toISOString()
                }
            ]
        };

        const metadataBuffer = Buffer.from(JSON.stringify(metadata));
        const result = await ipfs.add(metadataBuffer);
        const metadataCID = result.path;

        res.json({ metadataCID, metadata });
    } catch (error) {
        console.error('Error uploading metadata:', error);
        res.status(500).json({ error: 'Failed to upload metadata' });
    }
});

// Fetch metadata from IPFS
app.get('/fetch-metadata/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        
        const chunks = [];
        for await (const chunk of ipfs.cat(cid)) {
            chunks.push(chunk);
        }
        
        const metadata = JSON.parse(Buffer.concat(chunks).toString());
        res.json(metadata);
    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// Start product journey simulation
app.post('/start-journey', async (req, res) => {
    try {
        const { tokenId, customerAddress, customerLocation } = req.body;
        
        console.log(`Starting journey for product ${tokenId} to customer ${customerAddress}`);
        
        // Initialize contracts
        const trackingContract = new ethers.Contract(contractAddresses.Tracking, trackingABI, signer);
        const registryContract = new ethers.Contract(contractAddresses.ProductRegistry, productRegistryABI, signer);
        
        // Start tracking
        await trackingContract.startTracking(tokenId, customerAddress);
        
        // Journey steps with locations
        const steps = [
            { step: "Manufactured", location: "Manufacturing Facility" },
            { step: "Dispatched", location: "Distribution Center" },
            { step: "In Transit", location: "Highway Hub" },
            { step: "Out for Delivery", location: "Local Delivery Center" },
            { step: "Delivered", location: customerLocation }
        ];
        
        let currentStep = 0;
        
        const interval = setInterval(async () => {
            try {
                if (currentStep >= steps.length) {
                    clearInterval(interval);
                    
                    // Transfer product to customer
                    await registryContract.buyProduct(tokenId, customerAddress);
                    console.log(`Product ${tokenId} delivered and transferred to customer`);
                    return;
                }
                
                const { step, location } = steps[currentStep];
                console.log(`Adding checkpoint: ${step} at ${location} for product ${tokenId}`);
                
                await trackingContract.addCheckpoint(tokenId, step, location);
                currentStep++;
                
            } catch (error) {
                console.error('Error adding checkpoint:', error);
                clearInterval(interval);
            }
        }, 10000); // 10 seconds interval
        
        res.json({ 
            success: true, 
            message: 'Journey started successfully',
            steps: steps.length,
            interval: '10 seconds'
        });
        
    } catch (error) {
        console.error('Error starting journey:', error);
        res.status(500).json({ error: 'Failed to start journey' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
    console.log('Make sure to:');
    console.log('1. Update contract addresses in contractAddresses object');
    console.log('2. Update IPFS credentials');
    console.log('3. Update Ganache private key');
});