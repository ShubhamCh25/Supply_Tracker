import React, { useState, useEffect } from 'react';

// ===== CONTRACT CONFIGURATION =====
// Replace these with your actual deployed contract addresses from Ganache
const CONTRACT_ADDRESSES = {
  ProductNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',      // NFT minting contract
  ProductRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',  // Product marketplace
  Tracking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'        // Shipment tracking
};

// ===== SMART CONTRACT ABIs =====
// Simplified ABIs - only the functions we need to call
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
  // ===== COMPONENT STATE =====
  const [role, setRole] = useState('');                    // 'manufacturer' or 'customer'
  const [account, setAccount] = useState('');              // Connected wallet address
  const [web3, setWeb3] = useState(null);                  // Web3 connection status
  const [contracts, setContracts] = useState({});          // Smart contract instances
  const [products, setProducts] = useState([]);            // List of products
  const [trackingData, setTrackingData] = useState({});    // Real-time tracking info
  const [loading, setLoading] = useState(false);           // Loading states

  // Form states for manufacturer
  const [productForm, setProductForm] = useState({
    title: '',
    location: '',
    image: null
  });
  
  // Customer purchase states
  const [customerLocation, setCustomerLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ===== WEB3 INITIALIZATION =====
  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request access to user's MetaMask accounts
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Get the connected account address
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setAccount(accounts[0]);
        
        // Set connection status
        setWeb3({ connected: true });
        
        console.log('Connected to MetaMask:', accounts[0]);
        alert('Connected to MetaMask! Note: This is a demo version. Connect to actual Ganache for full functionality.');
        
      } catch (error) {
        console.error('Failed to connect to MetaMask:', error);
        alert('Please install MetaMask and connect to Ganache (http://127.0.0.1:7545)');
      }
    } else {
      // Fallback for demo without MetaMask
      alert('MetaMask not detected. Running in demo mode.');
      setAccount('0x1234...demo');
      setWeb3({ connected: false, demo: true });
    }
  };

  // ===== IPFS FUNCTIONS =====
  const uploadToIPFS = async (file) => {
    // Simulates uploading image to IPFS via backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('QmMockImageCID' + Date.now());
      }, 1000);
    });
  };

  const uploadMetadata = async (metadata) => {
    // Simulates uploading metadata JSON to IPFS via backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('QmMockMetadataCID' + Date.now());
      }, 500);
    });
  };

  // ===== MANUFACTURER FUNCTIONS =====
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Step 1: Uploading image to IPFS...');
      // Upload image file to IPFS, get back a unique hash (CID)
      const imageCID = await uploadToIPFS(productForm.image);
      
      console.log('Step 2: Creating metadata...');
      // Create metadata JSON with product info + image CID
      const metadataCID = await uploadMetadata({
        title: productForm.title,
        location: productForm.location,
        imageCID
      });
      
      console.log('Step 3: Minting NFT...');
      // Call smart contract to mint NFT with metadata CID
      // In real version: await contracts.productNFT.mintProduct(metadataCID);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate blockchain call
      
      const tokenId = Date.now(); // Mock token ID from contract event
      
      console.log('Step 4: Registering in marketplace...');
      // Register the new NFT in the product registry
      // In real version: await contracts.productRegistry.registerProduct(tokenId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to local state for UI update
      const newProduct = {
        tokenId: tokenId.toString(),
        name: productForm.title,
        description: `Manufactured in ${productForm.location}`,
        image: productForm.image ? URL.createObjectURL(productForm.image) : 'https://via.placeholder.com/150',
        location: productForm.location,
        available: true
      };
      
      setProducts(prev => [...prev, newProduct]);
      
      alert(`Product created successfully! Token ID: ${tokenId}`);
      setProductForm({ title: '', location: '', image: null });
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product: ' + error.message);
    }
    
    setLoading(false);
  };

  const removeProduct = async (tokenId) => {
    try {
      console.log('Removing product from marketplace...');
      // Call smart contract to mark product as unavailable
      // In real version: await contracts.productRegistry.removeProduct(tokenId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.tokenId === tokenId 
          ? { ...product, available: false }
          : product
      ));
      
      alert('Product removed successfully!');
    } catch (error) {
      alert('Failed to remove product: ' + error.message);
    }
  };

  // ===== CUSTOMER FUNCTIONS =====
  const startProductJourney = async (tokenId) => {
    if (!customerLocation.trim()) {
      alert('Please enter your delivery location');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Starting product journey simulation...');
      
      // Initialize tracking state
      setTrackingData(prev => ({
        ...prev,
        [tokenId]: {
          currentStep: 'Starting Journey...',
          currentLocation: 'Preparing for dispatch',
          progress: 0
        }
      }));

      // Define the journey steps
      const steps = [
        { step: 'Manufactured', location: 'Manufacturing Facility', progress: 20 },
        { step: 'Dispatched', location: 'Distribution Center', progress: 40 },
        { step: 'In Transit', location: 'Highway Hub', progress: 60 },
        { step: 'Out for Delivery', location: 'Local Delivery Center', progress: 80 },
        { step: 'Delivered', location: customerLocation, progress: 100 }
      ];

      let currentStepIndex = 0;
      
      // Simulate real-time tracking updates every 3 seconds
      const interval = setInterval(async () => {
        if (currentStepIndex >= steps.length) {
          clearInterval(interval);
          
          console.log('Journey complete - transferring NFT ownership...');
          // Mark product as purchased and owned by customer
          setProducts(prev => prev.map(product => 
            product.tokenId === tokenId 
              ? { ...product, available: false, ownedBy: account }
              : product
          ));
          
          setLoading(false);
          alert('Product delivered successfully! NFT transferred to your wallet.');
          return;
        }

        const currentStep = steps[currentStepIndex];
        console.log(`Checkpoint ${currentStepIndex + 1}: ${currentStep.step} at ${currentStep.location}`);
        
        // Update tracking data in real-time
        setTrackingData(prev => ({
          ...prev,
          [tokenId]: {
            currentStep: currentStep.step,
            currentLocation: currentStep.location,
            progress: currentStep.progress,
            lastUpdate: new Date()
          }
        }));

        // In real version: await contracts.tracking.addCheckpoint(tokenId, step, location);
        currentStepIndex++;
      }, 3000); // 3 seconds for demo (10 seconds in production)

    } catch (error) {
      console.error('Error starting journey:', error);
      alert('Failed to start product journey');
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductForm(prev => ({ ...prev, image: file }));
    }
  };

  // ===== UI COMPONENTS =====

  // ROLE SELECTION SCREEN
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Blockchain Product Tracker
          </h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Role
            </label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Choose a role...</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          
          {account && (
            <div className="text-sm text-gray-600 text-center">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MANUFACTURER DASHBOARD
  if (role === 'manufacturer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Manufacturer Dashboard</h1>
              <button 
                onClick={() => setRole('')}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Switch Role
              </button>
            </div>
            <p className="text-sm text-gray-600">Account: {account}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* PRODUCT CREATION FORM */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Upload New Product</h2>
              
              <form onSubmit={handleProductSubmit} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                {/* Product Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={productForm.title}
                    onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                {/* Manufacturing Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manufacturing Location
                  </label>
                  <input
                    type="text"
                    value={productForm.location}
                    onChange={(e) => setProductForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter manufacturing location"
                    required
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-md font-medium"
                >
                  {loading ? 'Creating Product...' : 'Create Product NFT'}
                </button>
              </form>
            </div>

            {/* MANUFACTURER'S PRODUCT LIST */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Products</h2>
                <button
                  onClick={() => {
                    // Mock loading manufacturer products for demo
                    setProducts([
                      {
                        tokenId: '1',
                        name: 'Premium Headphones',
                        description: 'High-quality audio equipment',
                        image: 'https://via.placeholder.com/150',
                        location: 'California, USA',
                        available: true
                      },
                      {
                        tokenId: '2',
                        name: 'Smart Watch',
                        description: 'Advanced fitness tracker',
                        image: 'https://via.placeholder.com/150',
                        location: 'Tokyo, Japan',
                        available: true
                      }
                    ]);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                >
                  Load Products
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No products yet. Create your first product!</p>
                ) : (
                  products.map((product) => (
                    <div key={product.tokenId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">Token ID: {product.tokenId}</p>
                          <p className="text-sm text-gray-500">Location: {product.location}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.available ? 'Available' : 'Sold'}
                          </span>
                        </div>
                        {product.available && (
                          <button
                            onClick={() => removeProduct(product.tokenId)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CUSTOMER DASHBOARD
  if (role === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <button 
                onClick={() => setRole('')}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Switch Role
              </button>
            </div>
            <p className="text-sm text-gray-600">Account: {account}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* AVAILABLE PRODUCTS MARKETPLACE */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Available Products</h2>
                <button
                  onClick={() => {
                    // Mock loading available products from smart contract
                    setProducts([
                      {
                        tokenId: '1',
                        name: 'Premium Headphones',
                        description: 'High-quality audio equipment',
                        image: 'https://via.placeholder.com/150',
                        location: 'California, USA',
                        available: true
                      },
                      {
                        tokenId: '3',
                        name: 'Wireless Speaker',
                        description: 'Portable bluetooth speaker',
                        image: 'https://via.placeholder.com/150',
                        location: 'Berlin, Germany',
                        available: true
                      }
                    ]);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  Load Products
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {products.filter(p => p.available).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No products available</p>
                ) : (
                  products.filter(p => p.available).map((product) => (
                    <div key={product.tokenId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">{product.description}</p>
                          <p className="text-sm text-gray-500">From: {product.location}</p>
                        </div>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TRACKING & PURCHASE SECTION */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Product Tracking</h2>
              
              {/* PURCHASE FORM */}
              {selectedProduct && !trackingData[selectedProduct.tokenId] && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Selected: {selectedProduct.name}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Delivery Location
                      </label>
                      <input
                        type="text"
                        value={customerLocation}
                        onChange={(e) => setCustomerLocation(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter your address"
                      />
                    </div>
                    <button
                      onClick={() => startProductJourney(selectedProduct.tokenId)}
                      disabled={loading || !customerLocation.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 px-4 rounded-md"
                    >
                      {loading ? 'Starting Journey...' : 'Purchase & Track'}
                    </button>
                  </div>
                </div>
              )}

              {/* REAL-TIME TRACKING DISPLAY */}
              {Object.entries(trackingData).map(([tokenId, tracking]) => {
                const product = products.find(p => p.tokenId === tokenId);
                return (
                  <div key={tokenId} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Tracking: {product?.name || `Product ${tokenId}`}
                    </h3>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{tracking.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${tracking.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Current Status */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium text-gray-900">{tracking.currentStep}</p>
                          <p className="text-sm text-gray-600">{tracking.currentLocation}</p>
                          {tracking.lastUpdate && (
                            <p className="text-xs text-gray-500">
                              Updated: {tracking.lastUpdate.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* OWNED PRODUCTS */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Your Products</h3>
                <div className="space-y-2">
                  {products.filter(p => p.ownedBy === account).map((product) => (
                    <div key={product.tokenId} className="flex items-center space-x-3 p-3 bg-green-50 rounded-md">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                      <div>
                        <p className="font-medium text-green-900">{product.name}</p>
                        <p className="text-sm text-green-700">Delivered ✓</p>
                      </div>
                    </div>
                  ))}
                  {products.filter(p => p.ownedBy === account).length === 0 && (
                    <p className="text-gray-500 text-sm">No owned products yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
export default BlockchainProductApp;