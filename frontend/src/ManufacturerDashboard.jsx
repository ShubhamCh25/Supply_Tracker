import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { QRCodeCanvas } from "qrcode.react";
import { 
  uploadToPinata, 
  uploadMetadatatoPinata, 
  ConnectionStatus,
  PINATA_GATEWAY 
} from './Constants'; 

const categoryFields = {
  Seeds: [
    { name: "cropType", label: "Crop Type" },
    { name: "batchNo", label: "Batch Number" },
    { name: "expiryDate", label: "Expiry Date" }
  ],
  Fertilizer: [
    { name: "chemicalComposition", label: "Chemical Composition" },
    { name: "npkRatio", label: "NPK Ratio" },
    { name: "manufactureDate", label: "Manufacture Date" }
  ],
  Pesticide: [
    { name: "activeIngredient", label: "Active Ingredient" },
    { name: "concentration", label: "Concentration (%)" },
    { name: "safetyPeriod", label: "Safety Period (Days)" }
  ],
  Tractor: [
    { name: "modelNo", label: "Model Number" },
    { name: "power", label: "Power (HP)" },
    { name: "serialNo", "label": "Serial Number" }
  ],
  Tools: [
    { name: "toolType", label: "Tool Type" },
    { name: "warrantyPeriod", label: "Warranty Period" }
  ]
};

// === PDF GENERATOR ===
async function generatePDF(baseFile, extraData) {
  // === PERFORMANCE CHECK START: PDF Generation ===
  const startPdfGen = performance.now(); 
  
  const existingPdfBytes = await baseFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = 750;
  page.drawText("Product Details", { x: 50, y, size: 18, font, color: rgb(0, 0.53, 0.71) });
  y -= 40;

  Object.entries(extraData).forEach(([key, value]) => {
    page.drawText(`${key}: ${value}`, { x: 50, y, size: 12, font, color: rgb(0, 0, 0) });
    y -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  const file = new File([pdfBytes], `Product_${Date.now()}.pdf`, { type: 'application/pdf' });

  // === PERFORMANCE CHECK END: PDF Generation ===
  const endPdfGen = performance.now();
  // Log the time taken for PDF generation
  console.log(`[PERF] PDF Generation Time: ${(endPdfGen - startPdfGen).toFixed(2)} ms`);
  
  return file;
}

const ManufacturerDashboard = ({ 
  account, 
  contracts, 
  connectionStatus, 
  setRole, 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [extraData, setExtraData] = useState({});
  
  const [productForm, setProductForm] = useState({
    title: '',
    location: '',
    image: null,
    pdf: null
  });

  // === INPUT HANDLERS ===
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setProductForm(prev => ({ ...prev, image: file }));
  };

  const handlePDFChange = (e) => {
    const file = e.target.files[0];
    if (file) setProductForm(prev => ({ ...prev, pdf: file }));
  };

  // === CREATE PRODUCT ===
  const handleProductSubmit = async (e) => {
    e.preventDefault();

    if (!contracts.productNFT || !contracts.productRegistry) {
      alert('Contracts not initialized. Please check your connection to Ganache.');
      return;
    }

    if (!category) {
      alert("Please select a product category.");
      return;
    }

    setIsCreating(true);

    // === PERFORMANCE CHECK START: Total Submission ===
    const startTime = performance.now();

    try {
      // === PERFORMANCE CHECK START: Image Upload ===
      const startImageUpload = performance.now();
      const imageUpload = await uploadToPinata(productForm.image);
      const endImageUpload = performance.now();
      console.log(`[PERF] Image Upload Time: ${(endImageUpload - startImageUpload).toFixed(2)} ms (CID: ${imageUpload.cid})`);
      
      // 🧩 Add dynamic fields into the PDF before upload
      let pdfUpload = null;
      if (productForm.pdf) {
        const enrichedPDF = await generatePDF(productForm.pdf, { category, ...extraData });
        
        // === PERFORMANCE CHECK START: PDF Upload ===
        const startPdfUpload = performance.now();
        pdfUpload = await uploadToPinata(enrichedPDF);
        const endPdfUpload = performance.now();
        console.log(`[PERF] PDF Upload Time: ${(endPdfUpload - startPdfUpload).toFixed(2)} ms (CID: ${pdfUpload.cid})`);
      }

      // === Build metadata JSON ===
      const metadata = {
        name: productForm.title,
        description: `Manufactured in ${productForm.location}`,
        image: `ipfs://${imageUpload.cid}`,
        attributes: [
          { trait_type: "Manufacturing Location", value: productForm.location },
          { trait_type: "Manufacturer Address", value: account },
          { trait_type: "Product Category", value: category },
          ...Object.entries(extraData).map(([key, value]) => ({
            trait_type: key,
            value: value
          })),
          { trait_type: "Created Date", value: new Date().toISOString() },
          ...(pdfUpload ? [{ trait_type: "Documentation", value: `ipfs://${pdfUpload.cid}` }] : [])
        ]
      };
      
      // === PERFORMANCE CHECK START: Metadata Upload ===
      const startMetadataUpload = performance.now();
      const metadataUpload = await uploadMetadatatoPinata(metadata);
      const endMetadataUpload = performance.now();
      console.log(`[PERF] Metadata Upload Time: ${(endMetadataUpload - startMetadataUpload).toFixed(2)} ms (CID: ${metadataUpload.cid})`);
     
      // Mint the product NFT
      // === PERFORMANCE CHECK START: Mint Transaction (On-chain) ===
      const startMintTx = performance.now();
      const mintTx = await contracts.productNFT.mintProduct(metadataUpload.cid);
      const mintReceipt = await mintTx.wait();
      const endMintTx = performance.now();
      console.log(`[PERF] Mint Transaction Time (On-chain): ${(endMintTx - startMintTx).toFixed(2)} ms (Gas Used: ${mintReceipt.gasUsed.toString()})`);

      // Grant approval to the ProductRegistry contract to handle transfers
      const startApprovalTx = performance.now();
      await contracts.productNFT.setApprovalForAll(contracts.productRegistry.target, true);
      const endApprovalTx = performance.now();
      console.log(`[PERF] Approval Transaction Time: ${(endApprovalTx - startApprovalTx).toFixed(2)} ms`);


      // Continue as before
      let tokenId;
      for (const log of mintReceipt.logs) {
        if (log.address.toLowerCase() === contracts.productNFT.target.toLowerCase()) {
          try {
            const parsedLog = contracts.productNFT.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
            if (parsedLog && parsedLog.name === "ProductMinted") {
              tokenId = parsedLog.args.tokenId.toString();
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }

      if (!tokenId) throw new Error("ProductMinted event not found.");
      
      // === PERFORMANCE CHECK START: Register Transaction (On-chain) ===
      const startRegisterTx = performance.now();
      const registerTx = await contracts.productRegistry.registerProduct(tokenId);
      await registerTx.wait();
      const endRegisterTx = performance.now();
      console.log(`[PERF] Register Transaction Time (On-chain): ${(endRegisterTx - startRegisterTx).toFixed(2)} ms`);


      const newProduct = {
        tokenId,
        name: productForm.title,
        description: metadata.description,
        image: imageUpload.url,
        pdf: pdfUpload ? pdfUpload.url : null,
        location: productForm.location,
        category,
        available: true,
        metadataURI: metadataUpload.url,
        owner: account
      };

      setProducts((prev) => [...prev, newProduct]);
      alert(`✅ Product created successfully! Token ID: ${tokenId}`);
      setProductForm({ title: '', location: '', image: null, pdf: null });
      setCategory('');
      setExtraData({});

    } catch (error) {
      console.error('Error creating product:', error);
      alert(`❌ Failed to create product: ${error.message}`);
    }

    setIsCreating(false);
    // === PERFORMANCE CHECK END: Total Submission ===
    const endTime = performance.now();
    console.log(`[PERF] TOTAL CREATE PRODUCT TIME: ${(endTime - startTime).toFixed(2)} ms`);
  };

  // === LOAD PRODUCTS ===
  const loadManufacturerProducts = async () => {
    if (!contracts.productRegistry || !contracts.productNFT) {
      alert('Contracts not initialized');
      return;
    }

    setIsLoadingProducts(true);
    // === PERFORMANCE CHECK START: Total Load Products ===
    const startTime = performance.now();

    try {
      // === PERFORMANCE CHECK START: Fetch Token IDs ===
      const startFetchIds = performance.now();
      const tokenIds = await contracts.productRegistry.getAvailableProducts();
      const endFetchIds = performance.now();
      console.log(`[PERF] Fetch Token IDs Time: ${(endFetchIds - startFetchIds).toFixed(2)} ms (${tokenIds.length} tokens)`);

      if (tokenIds.length === 0) {
        setProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      const baseGatewayUrl = `https://${PINATA_GATEWAY}/ipfs/`;

      const productPromises = tokenIds.map(async (tokenId) => {
        try {
          // === PERFORMANCE CHECK START: Single Product Details Fetch ===
          const startSingleFetch = performance.now();

          const [metadataCID, productData, owner] = await Promise.all([
            contracts.productNFT.tokenURI(tokenId),
            contracts.productRegistry.getProduct(tokenId),
            contracts.productNFT.ownerOf(tokenId)
          ]);
          
          // Use the dynamic baseGatewayUrl for fetching metadata and image/pdf links
          const metadataUrl = `${baseGatewayUrl}${metadataCID.replace("ipfs://", "")}`;
          // === PERFORMANCE CHECK START: Metadata HTTP Fetch ===
          const startMetadataFetch = performance.now();
          const metadata = await fetch(metadataUrl).then((res) => res.json());
          const endMetadataFetch = performance.now();
          console.log(`[PERF] Metadata HTTP Fetch Time for ID ${tokenId}: ${(endMetadataFetch - startMetadataFetch).toFixed(2)} ms`);


          const docAttr = metadata.attributes?.find(a => a.trait_type === "Documentation");
          const pdfUrl = docAttr ? `${baseGatewayUrl}${docAttr.value.replace("ipfs://", "")}` : null;

          // === PERFORMANCE CHECK END: Single Product Details Fetch ===
          const endSingleFetch = performance.now();
          console.log(`[PERF] Total Data Load Time for ID ${tokenId}: ${(endSingleFetch - startSingleFetch).toFixed(2)} ms`);

          return {
            tokenId: tokenId.toString(),
            name: metadata.name,
            description: metadata.description,
            image: metadata.image.replace("ipfs://", baseGatewayUrl), // Use dynamic gateway
            pdf: pdfUrl,
            location: metadata.attributes?.find(a => a.trait_type === "Manufacturing Location")?.value || "Unknown",
            category: metadata.attributes?.find(a => a.trait_type === "Product Category")?.value || "N/A",
            available: productData.available,
            metadataURI: metadataUrl,
            owner
          };
        } catch (error) {
          console.error(`Error loading details for product ${tokenId}:`, error);
          return null;
        }
      });

      const loadedProducts = await Promise.all(productPromises);
      
      // Filter the final list to only show products where the manufacturer is the owner
      setProducts(loadedProducts
          .filter(p => p !== null)
          .filter(p => p.owner.toLowerCase() === account.toLowerCase())
      );


    } catch (error) {
      console.error('Error loading products:', error);
      alert(`Failed to load products: ${error.message}`);
    }

    setIsLoadingProducts(false);
    // === PERFORMANCE CHECK END: Total Load Products ===
    const endTime = performance.now();
    console.log(`[PERF] TOTAL LOAD PRODUCTS TIME: ${(endTime - startTime).toFixed(2)} ms`);
  };

  // === REMOVE PRODUCT ===
  const removeProduct = async (tokenId) => {
    if (!contracts.productRegistry) {
      alert('Contract not initialized');
      return;
    }

    const product = products.find(p => p.tokenId === tokenId);
    if (product && product.owner.toLowerCase() !== account.toLowerCase()) {
      alert("You can only remove products you own.");
      return;
    }

    setIsCreating(true);
    // === PERFORMANCE CHECK START: Remove Product Transaction ===
    const startRemoveTx = performance.now();

    try {
      const removeTx = await contracts.productRegistry.removeProduct(tokenId);
      const receipt = await removeTx.wait();

      setProducts((prev) =>
        prev.map((product) =>
          product.tokenId === tokenId ? { ...product, available: false } : product
        )
      );

      alert('Product removed successfully!');
      // === PERFORMANCE CHECK END: Remove Product Transaction ===
      const endRemoveTx = performance.now();
      console.log(`[PERF] Remove Product Transaction Time: ${(endRemoveTx - startRemoveTx).toFixed(2)} ms (Gas Used: ${receipt.gasUsed.toString()})`);
    } catch (error) {
      console.error('Error removing product:', error);
      alert(`Failed to remove product: ${error.message}`);
    }

    setIsCreating(false);
  };

  const isAnyLoading = isCreating || isLoadingProducts;

  // === UI ===
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-green-400">AgriTrade</h1>
            <h2 className="text-lg font-semibold text-white">Manufacturer Dashboard</h2>
            <p className="text-sm text-gray-400">Account: {account}</p>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectionStatus status={connectionStatus} /> 
            <button 
              onClick={() => setRole('')}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md"
            >
              Switch Role
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        
        {/* === CREATE PRODUCT FORM === */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Create New Product NFT</h2>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setExtraData({});
                }}
                className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white"
                required
              >
                <option value="">Select Category</option>
                {Object.keys(categoryFields).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Fields */}
            {category &&
              categoryFields[category].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={extraData[field.name] || ""}
                    onChange={(e) =>
                      setExtraData((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white"
                    placeholder={`Enter ${field.label}`}
                    required
                  />
                </div>
              ))}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Image</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Upload PDF (Optional)</label>
              <input type="file" accept="application/pdf" onChange={handlePDFChange} className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product Title</label>
              <input type="text" value={productForm.title} onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))} className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="Enter product name" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Manufacturing Location</label>
              <input type="text" value={productForm.location} onChange={(e) => setProductForm(prev => ({ ...prev, location: e.target.value }))} className="w-full p-3 border border-gray-600 rounded-md bg-gray-700 text-white" placeholder="Enter manufacturing location" required />
            </div>

            <button type="submit" disabled={isCreating || connectionStatus !== 'connected'} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 px-4 rounded-md font-medium">
              {isCreating ? 'Creating NFT...' : 'Create Product NFT'}
            </button>
          </form>
        </div>

        {/* === PRODUCT LIST === */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">All Registered Products</h2>
            <button onClick={loadManufacturerProducts} disabled={isLoadingProducts || connectionStatus !== 'connected'} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md text-sm">
              {isLoadingProducts ? 'Loading...' : 'Refresh Products'}
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No products found. Click "Refresh Products" to load them.</p>
            ) : (
              products.map((product) => (
                <div key={product.tokenId} className="border border-gray-600 rounded-lg p-4 bg-gray-700 bg-opacity-50">
                  <div className="flex items-start space-x-4">
                    <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-md" />
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{product.name}</h3>
                      <p className="text-sm text-gray-400">Category: {product.category}</p>
                      <p className="text-sm text-gray-400">Location: {product.location}</p>
                      <p className="text-xs text-gray-400 mt-1">Owner: {product.owner.slice(0, 6)}...{product.owner.slice(-4)}</p>

                      {product.pdf && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-300 mb-1">Documentation:</p>
                          <QRCodeCanvas value={product.pdf} size={96} bgColor="#fff" fgColor="#000" />
                        </div>
                      )}
                    </div>
                    {product.owner.toLowerCase() === account.toLowerCase() && product.available && (
                      <button onClick={() => removeProduct(product.tokenId)} disabled={isAnyLoading} className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm rounded-md">
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
  );
};

export default ManufacturerDashboard;