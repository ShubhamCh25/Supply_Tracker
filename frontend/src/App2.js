

// ===== CONFIGURATION =====
const GANACHE_URL = 'http://127.0.0.1:8545';
const GANACHE_CHAIN_ID = '0x539'; // 1337 in hex

// Replace with your NFT.Storage API key
const NFT_STORAGE_API_KEY = 'f764c6fc.9666c515e2bc400f81619655b9a2c297';

// Replace these with your actual deployed contract addresses from Ganache
const CONTRACT_ADDRESSES = {
  ProductNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ProductRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  Tracking: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
};

// ===== SMART CONTRACT ABIs =====
const PRODUCT_NFT_ABI = [
  "function mintProduct(string memory metadataCID) public returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "event ProductMinted(uint256 indexed tokenId, address indexed owner, string metadataCID)"
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
  const [role, setRole] = useState('');
  const [account, setAccount] = useState('');
  const [web3, setWeb3] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contracts, setContracts] = useState({});
  const [products, setProducts] = useState([]);
  const [trackingData, setTrackingData] = useState({});
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Form states
  const [productForm, setProductForm] = useState({
    title: '',
    location: '',
    image: null
  });
  
  const [customerLocation, setCustomerLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ===== WEB3 INITIALIZATION =====
  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setConnectionStatus('connecting');
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Switch to Ganache network
        await switchToGanache();
        
        // Create Web3 provider
      
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const account = await signer.getAddress();
        
        setProvider(provider);
        setAccount(account);
        setWeb3(ethers);
        setConnectionStatus('connected');
        
        // Initialize contracts
        await initializeContracts(provider, signer, ethers);
        
        console.log('Connected to Ganache:', account);
        alert('Successfully connected to Ganache!');
        
      } catch (error) {
        console.error('Failed to connect to Ganache:', error);
        setConnectionStatus('error');
        alert('Failed to connect to Ganache. Make sure it\'s running on port 8545 and try again.');
      }
    } else {
      alert('Please install MetaMask to use this application');
      setConnectionStatus('no-metamask');
    }
  };

  const switchToGanache = async () => {
    try {
      // Try to switch to Ganache network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: GANACHE_CHAIN_ID }],
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: GANACHE_CHAIN_ID,
              chainName: 'Ganache Local',
              rpcUrls: [GANACHE_URL],
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
            }],
          });
        } catch (addError) {
          throw new Error('Failed to add Ganache network');
        }
      } else {
        throw switchError;
      }
    }
  };

  const initializeContracts = async (provider, signer, ethers) => {
    try {
      const productNFT = new ethers.Contract(
        CONTRACT_ADDRESSES.ProductNFT,
        PRODUCT_NFT_ABI,
        signer
      );
      
      const productRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.ProductRegistry,
        PRODUCT_REGISTRY_ABI,
        signer
      );
      
      const tracking = new ethers.Contract(
        CONTRACT_ADDRESSES.Tracking,
        TRACKING_ABI,
        signer
      );

      setContracts({
        productNFT,
        productRegistry,
        tracking
      });

      console.log('Contracts initialized successfully');
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw new Error('Contract initialization failed');
    }
  };

  // ===== IPFS FUNCTIONS WITH NFT.STORAGE =====
  const uploadToPinata = async (file) => {
    if (!NFT_STORAGE_API_KEY ) {
      throw new Error('Please configure your NFT.Storage API key');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NFT_STORAGE_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload to NFT.Storage');
      }

      const data = await response.json();
      return data.value.cid;
    } catch (error) {
      console.error('Error uploading to NFT.Storage:', error);
      throw error;
    }
  };

  const uploadMetadatatoPinata = async (metadata) => {
    if (!NFT_STORAGE_API_KEY) {
      throw new Error('Please configure your NFT.Storage API key');
    }

    try {
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const formData = new FormData();
      formData.append('file', metadataBlob, 'metadata.json');

      const response = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NFT_STORAGE_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload metadata to NFT.Storage');
      }

      const data = await response.json();
      return data.value.cid;
    } catch (error) {
      console.error('Error uploading metadata to NFT.Storage:', error);
      throw error;
    }
  };

  // ===== MANUFACTURER FUNCTIONS =====
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    if (!contracts.productNFT || !contracts.productRegistry) {
      alert('Contracts not initialized. Please check your connection to Ganache.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Step 1: Uploading image to IPFS...');
      const imageCID = await uploadToPinata(productForm.image);
      console.log('Image uploaded, CID:', imageCID);
      
      console.log('Step 2: Creating and uploading metadata...');
      const metadata = {
        name: productForm.title,
        description: `Manufactured in ${productForm.location}`,
        image: `ipfs://${imageCID}`,
        attributes: [
          {
            trait_type: "Manufacturing Location",
            value: productForm.location
          },
          {
            trait_type: "Created Date",
            value: new Date().toISOString()
          }
        ]
      };
      
      const metadataCID = await uploadMetadatatoPinata(metadata);
      console.log('Metadata uploaded, CID:', metadataCID);
      
      console.log('Step 3: Minting NFT on blockchain...');
      const mintTx = await contracts.productNFT.mintProduct(metadataCID);
      const mintReceipt = await mintTx.wait();
      
      // Get token ID from mint event
      const mintEvent = mintReceipt.logs.find(log => 
        log.topics[0] === web3.id('ProductMinted(uint256,address,string)')
      );
      const tokenId = web3.toBigInt(mintEvent.topics[1]).toString();
      
      console.log('Step 4: Registering in marketplace...');
      const registerTx = await contracts.productRegistry.registerProduct(tokenId);
      await registerTx.wait();
      
      // Add to local state
      const newProduct = {
        tokenId,
        name: productForm.title,
        description: metadata.description,
        image: URL.createObjectURL(productForm.image),
        location: productForm.location,
        available: true,
        metadataURI: `ipfs://${metadataCID}`
      };
      
      setProducts(prev => [...prev, newProduct]);
      
      alert(`Product created successfully! Token ID: ${tokenId}`);
      setProductForm({ title: '', location: '', image: null });
      
    } catch (error) {
      console.error('Error creating product:', error);
      alert(`Failed to create product: ${error.message}`);
    }
    
    setLoading(false);
  };

  const removeProduct = async (tokenId) => {
    if (!contracts.productRegistry) {
      alert('Contract not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Removing product from marketplace...');
      
      const removeTx = await contracts.productRegistry.removeProduct(tokenId);
      await removeTx.wait();
      
      setProducts(prev => prev.map(product => 
        product.tokenId === tokenId 
          ? { ...product, available: false }
          : product
      ));
      
      alert('Product removed successfully!');
    } catch (error) {
      console.error('Error removing product:', error);
      alert(`Failed to remove product: ${error.message}`);
    }
    
    setLoading(false);
  };

  const loadManufacturerProducts = async () => {
    if (!contracts.productRegistry) {
      alert('Contract not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading your products from blockchain...');
      
      const tokenIds = await contracts.productRegistry.getProductsByOwner(account);
      const loadedProducts = [];
      
      for (const tokenId of tokenIds) {
        try {
          const metadataURI = await contracts.productNFT.tokenURI(tokenId);
          // In a real app, you'd fetch and parse the metadata from IPFS
          loadedProducts.push({
            tokenId: tokenId.toString(),
            name: `Product ${tokenId}`,
            description: 'Loaded from blockchain',
            image: 'https://via.placeholder.com/150',
            location: 'Unknown',
            available: true,
            metadataURI
          });
        } catch (error) {
          console.error(`Error loading product ${tokenId}:`, error);
        }
      }
      
      setProducts(loadedProducts);
      console.log('Loaded products:', loadedProducts);
      
    } catch (error) {
      console.error('Error loading products:', error);
      alert(`Failed to load products: ${error.message}`);
    }
    
    setLoading(false);
  };

  // ===== CUSTOMER FUNCTIONS =====
  const loadAvailableProducts = async () => {
    if (!contracts.productRegistry) {
      alert('Contract not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading available products from marketplace...');
      
      const tokenIds = await contracts.productRegistry.getAvailableProducts();
      const availableProducts = [];
      
      for (const tokenId of tokenIds) {
        try {
          const owner = await contracts.productNFT.ownerOf(tokenId);
          const metadataURI = await contracts.productNFT.tokenURI(tokenId);
          
          // In a real app, you'd fetch metadata from IPFS
          availableProducts.push({
            tokenId: tokenId.toString(),
            name: `Product ${tokenId}`,
            description: 'Available for purchase',
            image: 'https://via.placeholder.com/150',
            location: 'Various',
            available: true,
            owner,
            metadataURI
          });
        } catch (error) {
          console.error(`Error loading product ${tokenId}:`, error);
        }
      }
      
      setProducts(availableProducts);
      console.log('Loaded available products:', availableProducts);
      
    } catch (error) {
      console.error('Error loading available products:', error);
      alert(`Failed to load products: ${error.message}`);
    }
    
    setLoading(false);
  };

  const startProductJourney = async (tokenId) => {
    if (!customerLocation.trim()) {
      alert('Please enter your delivery location');
      return;
    }

    if (!contracts.productRegistry || !contracts.tracking) {
      alert('Contracts not initialized');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Step 1: Processing purchase on blockchain...');
      const buyTx = await contracts.productRegistry.buyProduct(tokenId, account);
      await buyTx.wait();
      
      console.log('Step 2: Starting tracking...');
      const trackTx = await contracts.tracking.startTracking(tokenId, account);
      await trackTx.wait();
      
      // Initialize tracking state
      setTrackingData(prev => ({
        ...prev,
        [tokenId]: {
          currentStep: 'Purchase Confirmed',
          currentLocation: 'Processing',
          progress: 10
        }
      }));

      // Simulate tracking steps with real blockchain calls
      const steps = [
        { step: 'Manufactured', location: 'Manufacturing Facility', progress: 20 },
        { step: 'Dispatched', location: 'Distribution Center', progress: 40 },
        { step: 'In Transit', location: 'Highway Hub', progress: 60 },
        { step: 'Out for Delivery', location: 'Local Delivery Center', progress: 80 },
        { step: 'Delivered', location: customerLocation, progress: 100 }
      ];

      let currentStepIndex = 0;
      
      const interval = setInterval(async () => {
        if (currentStepIndex >= steps.length) {
          clearInterval(interval);
          setLoading(false);
          alert('Product delivered successfully! Check blockchain for complete tracking history.');
          return;
        }

        const currentStep = steps[currentStepIndex];
        
        try {
          // Add checkpoint to blockchain
          const checkpointTx = await contracts.tracking.addCheckpoint(
            tokenId,
            currentStep.step,
            currentStep.location
          );
          await checkpointTx.wait();
          
          console.log(`Checkpoint added: ${currentStep.step} at ${currentStep.location}`);
          
          // Update UI
          setTrackingData(prev => ({
            ...prev,
            [tokenId]: {
              currentStep: currentStep.step,
              currentLocation: currentStep.location,
              progress: currentStep.progress,
              lastUpdate: new Date()
            }
          }));

        } catch (error) {
          console.error('Error adding checkpoint:', error);
        }

        currentStepIndex++;
      }, 5000); // 5 seconds between checkpoints

    } catch (error) {
      console.error('Error starting product journey:', error);
      alert(`Failed to start journey: ${error.message}`);
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductForm(prev => ({ ...prev, image: file }));
    }
  };

  // ===== CONNECTION STATUS COMPONENT =====
  const ConnectionStatus = () => (
    <div className={`px-3 py-1 rounded-full text-sm ${
      connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
      connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
      'bg-red-100 text-red-800'
    }`}>
      {connectionStatus === 'connected' ? '🟢 Connected to Ganache' :
       connectionStatus === 'connecting' ? '🟡 Connecting...' :
       '🔴 Disconnected'}
    </div>
  );

  // ===== UI COMPONENTS =====

  // ROLE SELECTION SCREEN
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
            Blockchain Product Tracker
          </h1>
          <p className="text-center text-gray-600 mb-6">Production Version</p>
          
          <div className="mb-6">
            <ConnectionStatus />
          </div>
          
          {connectionStatus !== 'connected' && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Make sure Ganache is running on port 8545 and try refreshing the page.
              </p>
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Role
            </label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={connectionStatus !== 'connected'}
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

          {!NFT_STORAGE_API_KEY && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ Please configure your NFT.Storage API key to upload files to IPFS
              </p>
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
              <div className="flex items-center space-x-4">
                <ConnectionStatus />
                <button 
                  onClick={() => setRole('')}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  Switch Role
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">Account: {account}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* PRODUCT CREATION FORM */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Product NFT</h2>
              
              <form onSubmit={handleProductSubmit} className="space-y-4">
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
                
                <button
                  type="submit"
                  disabled={loading || connectionStatus !== 'connected'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-md font-medium"
                >
                  {loading ? 'Creating NFT...' : 'Create Product NFT'}
                </button>
              </form>
            </div>

            {/* MANUFACTURER'S PRODUCT LIST */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Products</h2>
                <button
                  onClick={loadManufacturerProducts}
                  disabled={loading || connectionStatus !== 'connected'}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md text-sm"
                >
                  {loading ? 'Loading...' : 'Load from Blockchain'}
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No products found. Create your first product!</p>
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
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm rounded-md"
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
              <div className="flex items-center space-x-4">
                <ConnectionStatus />
                <button 
                  onClick={() => setRole('')}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  Switch Role
                </button>
              </div>
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
                  onClick={loadAvailableProducts}
                  disabled={loading || connectionStatus !== 'connected'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md text-sm"
                >
                  {loading ? 'Loading...' : 'Load from Blockchain'}
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
                          <p className="text-sm text-gray-500">Token ID: {product.tokenId}</p>
                        </div>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          disabled={loading}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm rounded-md"
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
                      disabled={loading || !customerLocation.trim() || connectionStatus !== 'connected'}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 px-4 rounded-md"
                    >
                      {loading ? 'Processing Purchase...' : 'Purchase & Track'}
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