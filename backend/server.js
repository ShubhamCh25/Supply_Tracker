
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { ethers } = require('ethers');

const app = express();
const port = 3001;

// IPFS setup - Using NFT.Storage (no problematic imports)
const { NFTStorage, File } = require('nft.storage');
const nftStorage = new NFTStorage({ 
    token: process.env.NFT_STORAGE_API_KEY || '' 
});

// Mock IPFS for development (set to false when you have real credentials)
const MOCK_IPFS = false;

// Middleware
app.use(cors());
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Blockchain setup
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Ganache
const privateKey = process.env.GANACHE_PRIVATE_KEY || '0xdecd09d82d8aa29657642cb7cb884c91278412c7950eae6a4f79686d2bb30018'; // Get from Ganache GUI
const signer = new ethers.Wallet(privateKey, provider);

// Contract addresses (update these after deployment)
const contractAddresses = {
    ProductNFT: process.env.PRODUCT_NFT_ADDRESS || '0x9069341477CD0267e035984DD487b420463Bb527',
    ProductRegistry: process.env.PRODUCT_REGISTRY_ADDRESS || '0x3A2B491B2130ce45943af88F47F4f79E0be7e5FA', 
    Tracking: process.env.TRACKING_ADDRESS || '0x12A8B237f62c175BC397DEE5C34437Ee4ab24831'
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

        let imageCID;

        if (MOCK_IPFS) {
            // Mock IPFS for development
            imageCID = 'QmMockImage' + Date.now() + Math.random().toString(36).substr(2, 9);
            console.log('Mock IPFS upload - Image CID:', imageCID);
        } else {
            // Real NFT.Storage upload
            const file = new File([req.file.buffer], req.file.originalname, {
                type: req.file.mimetype
            });
            imageCID = await nftStorage.storeBlob(file);
        }

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

        let metadataCID;

        if (MOCK_IPFS) {
            // Mock metadata upload
            metadataCID = 'QmMockMetadata' + Date.now() + Math.random().toString(36).substr(2, 9);
            console.log('Mock metadata upload - CID:', metadataCID);
        } else {
            // Real NFT.Storage upload
            const file = new File([JSON.stringify(metadata)], 'metadata.json', {
                type: 'application/json'
            });
            metadataCID = await nftStorage.storeBlob(file);
        }

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
        
        if (MOCK_IPFS) {
            // Return mock metadata
            const mockMetadata = {
                name: `Product ${cid.slice(-4)}`,
                description: 'Mock product for testing',
                image: 'https://via.placeholder.com/300x300?text=Product+Image',
                attributes: [
                    { trait_type: "Manufacturing Location", value: "Demo Location" },
                    { trait_type: "Created At", value: new Date().toISOString() }
                ]
            };
            res.json(mockMetadata);
        } else {
            // Real IPFS fetch would go here
            // const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
            // const metadata = await response.json();
            res.json({ error: 'Real IPFS fetch not implemented yet' });
        }
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