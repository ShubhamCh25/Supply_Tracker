import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Mock contract addresses - replace with actual deployed addresses
const CONTRACT_ADDRESSES = {
  ProductNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ProductRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  Tracking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

// Simplified ABIs
const PRODUCT_NFT_ABI = [
  "function mintProduct(string memory metadataCID) public returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)"
];

const PRODUCT_REGISTRY_ABI = [
  "function registerProduct(uint256 tokenId) public",
  "function removeProduct(uint256 tokenId) public",
  "function getAvailableProducts() public view returns (uint256[] memory)",
  "function getProductsByOwner(address owner) public view returns (uint256[] memory)",
  "function buyProduct(uint256 tokenId, address customerAddress) public",
  "event ProductPurchased(uint256 indexed tokenId, address indexed buyer, address indexed manufacturer)"
];

const TRACKING_ABI = [
  "function startTracking(uint256 tokenId, address customer) public",
  "function addCheckpoint(uint256 tokenId, string memory step, string memory location) public",
  "function getTrackingHistory(uint256 tokenId) public view returns (tuple(uint256 tokenId, string step, string location, uint256 timestamp)[] memory)",
  "event Checkpoint(uint256 indexed tokenId, string step, string location, uint256 timestamp, uint256 checkpointIndex)"
];

const BlockchainProductApp = () => {
  const [role, setRole] = useState('');
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contracts, setContracts] = useState({});
  const [products, setProducts] = useState([]);
  const [trackingData, setTrackingData] = useState({});
  const [loading, setLoading] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    title: '',
    location: '',
    image: null
  });
  const [customerLocation, setCustomerLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Initialize Web3
  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        
        setProvider(provider);
        setAccount(account);
        
        // Initialize contracts
        const productNFT = new ethers.Contract(CONTRACT_ADDRESSES.ProductNFT, PRODUCT_NFT_ABI, signer);
        const productRegistry = new ethers.Contract(CONTRACT_ADDRESSES.ProductRegistry, PRODUCT_REGISTRY_ABI, signer);
        const tracking = new ethers.Contract(CONTRACT_ADDRESSES.Tracking, TRACKING_ABI, signer);
        
        setContracts({ productNFT, productRegistry, tracking });
        
        // Setup event listeners
        setupEventListeners(tracking);
        
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        alert('Please install MetaMask and connect to Ganache (http://127.0.0.1:7545)');
      }
    } else {
      alert('MetaMask not detected. Please install MetaMask.');
    }
  };

  const setupEventListeners = (trackingContract) => {
    trackingContract.on('Checkpoint', (tokenId, step, location, timestamp, checkpointIndex) => {
      console.log('New checkpoint:', { tokenId: tokenId.toString(), step, location });
      setTrackingData(prev => ({
        ...prev,
        [tokenId.toString()]: {
          ...prev[tokenId.toString()],
          currentStep: step,
          currentLocation: location,
          lastUpdate: new Date(timestamp.toNumber() * 1000)
        }
      }));
    });
  };

  const uploadToIPFS = async (file) => {
    // Simulate IPFS upload - replace with actual IPFS upload
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('http://localhost:3001/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      return data.imageCID;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      // Fallback: return mock CID for demo
      return 'QmMockImageCID' + Date.now();
    }
  };

  const uploadMetadata = async (metadata) => {
    try {
      const response = await fetch('http://localhost:3001/upload-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      const data = await response.json();
      return data.metadataCID;
    } catch (error) {
      console.error('Metadata upload failed:', error);
      // Fallback: return mock CID for demo
      return 'QmMockMetadataCID' + Date.now();
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Upload image to IPFS
      const imageCID = await uploadToIPFS(productForm.image);
      
      // 2. Create and upload metadata
      const metadataCID = await uploadMetadata({
        title: productForm.title,
        location: productForm.location,
        imageCID
      });
      
      // 3. Mint NFT
      const tx = await contracts.productNFT.mintProduct(metadataCID);
      const receipt = await tx.wait();
      
      // Get token ID from event
      const event = receipt.events.find(e => e.event === 'ProductMinted');
      const tokenId = event.args.tokenId;
      
      // 4. Register product
      await contracts.productRegistry.registerProduct(tokenId);
      
      alert(`Product minted successfully! Token ID: ${tokenId.toString()}`);
      setProductForm({ title: '', location: '', image: null });
      
      if (role === 'manufacturer') {
        loadManufacturerProducts();
      }
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product: ' + error.message);
    }
    
    setLoading(false);
  };

  const loadManufacturerProducts = async () => {
    try {
      const tokenIds = await contracts.productRegistry.getProductsByOwner(account);
      const productData = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const tokenURI = await contracts.productNFT.tokenURI(tokenId);
            // Mock metadata fetch - replace with actual IPFS fetch
            const metadata = {
              name: `Product ${tokenId}`,
              description: 'Sample product',
              image: 'https://via.placeholder.com/150'
            };
            return { tokenId: tokenId.toString(), ...metadata };
          } catch (error) {
            return { tokenId: tokenId.toString(), name: `Product ${tokenId}`, error: true };
          }
        })
      );
      setProducts(productData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const tokenIds = await contracts.productRegistry.getAvailableProducts();
      const productData = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            // Mock metadata fetch
            const metadata = {
              name: `Product ${tokenId}`,
              description: 'Available for purchase',
              image: 'https://via.placeholder.com/150'
            };
            return { tokenId: tokenId.toString(), ...metadata };
          } catch (error) {
            return { tokenId: tokenId.toString(), name: `Product ${tokenId}`, error: true };
          }
        })
      );
      setProducts(productData);
    } catch (error) {
      console.error('Error loading available products:', error);
    }
  };

  const removeProduct = async (tokenId) => {
    try {
      await contracts.productRegistry.removeProduct(tokenId);
      alert('Product removed successfully!');
      loadManufacturerProducts();
    } catch (error) {
      alert('Failed to remove product: ' + error.message);
    }
  }