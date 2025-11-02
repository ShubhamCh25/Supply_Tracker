import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ConnectionStatus, uploadToPinata, pinata, PINATA_GATEWAY } from './Constants'; 
import { QRCodeCanvas } from "qrcode.react";

// === Helper: Upload updated metadata with new PDF CID ===
async function uploadUpdatedMetadata(oldMetadataUrl, newPdfCid) {
  
  // === PERFORMANCE CHECK START: Metadata Fetch for Update ===
  const startMetadataFetch = performance.now();
  
  // Use a reliable gateway for fetching old metadata
  const metadataRes = await fetch(oldMetadataUrl);
  if (!metadataRes.ok) throw new Error(`Failed to fetch metadata: ${metadataRes.statusText}`);
  const oldMetadata = await metadataRes.json();
  
  const endMetadataFetch = performance.now();
  console.log(`[PERF] Old Metadata Fetch Time (Customer): ${(endMetadataFetch - startMetadataFetch).toFixed(2)} ms`);

  const updatedMetadata = {
    ...oldMetadata,
    attributes: oldMetadata.attributes.map(attr =>
      attr.trait_type === "Documentation"
        ? { ...attr, value: `ipfs://${newPdfCid}` }
        : attr
    ),
    updatedAt: new Date().toISOString(),
  };

  // Convert metadata to JSON blob
  const metadataBlob = new Blob([JSON.stringify(updatedMetadata)], { type: "application/json" });

  // ✅ Use the imported 'pinata' object
  // === PERFORMANCE CHECK START: Updated Metadata Upload ===
  const startMetadataUpload = performance.now();
  
  const upload = await pinata.upload.public.file(metadataBlob);
  const newMetadataCid = upload.cid;

  const endMetadataUpload = performance.now();
  console.log(`[PERF] Updated Metadata Upload Time (Customer): ${(endMetadataUpload - startMetadataUpload).toFixed(2)} ms (New CID: ${newMetadataCid})`);

  return newMetadataCid;
}

const CustomerDashboard = ({ 
  account, 
  contracts, 
  connectionStatus, 
  setRole, 
  loading, 
  setLoading 
}) => {
  const [products, setProducts] = useState([]); 
  const [ownedProducts, setOwnedProducts] = useState([]);
  const [customerLocation, setCustomerLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // === Load all products owned or available (For Marketplace and Inventory) ===
  const loadCustomerData = async () => {
    if (!contracts.productRegistry || !contracts.productNFT || !account) return;

    try {
      setLoading(true);
      // === PERFORMANCE CHECK START: Total Customer Data Load ===
      const startTime = performance.now();
      
      // Fetch available and owned token IDs concurrently
      const startFetchIds = performance.now();
      const [availableTokenIds, ownedTokenIds] = await Promise.all([
          contracts.productRegistry.getAvailableProducts(),
          contracts.productRegistry.getProductsByOwner(account)
      ]);
      const endFetchIds = performance.now();
      console.log(`[PERF] Customer Fetch Token IDs Time: ${(endFetchIds - startFetchIds).toFixed(2)} ms (${availableTokenIds.length + ownedTokenIds.length} total tokens)`);
      
      const tokensToLoad = Array.from(new Set([...availableTokenIds, ...ownedTokenIds]));
      if (tokensToLoad.length === 0) {
        setProducts([]);
        setOwnedProducts([]);
        setLoading(false);
        return;
      }
      
      // ✅ Use your custom Pinata Gateway for loading data
      const baseGatewayUrl = `https://${PINATA_GATEWAY}/ipfs/`;

      const productPromises = tokensToLoad.map(async (tokenId) => {
        try {
          const [owner, metadataCID, registryProduct] = await Promise.all([
             contracts.productNFT.ownerOf(tokenId),
             contracts.productNFT.tokenURI(tokenId),
             contracts.productRegistry.getProduct(tokenId)
          ]);
          
          const metadataUrl = `${baseGatewayUrl}${metadataCID.replace("ipfs://", "")}`;
          
          // === PERFORMANCE CHECK START: Metadata HTTP Fetch (Customer List) ===
          const startMetadataFetch = performance.now();
          const metadata = await fetch(metadataUrl).then((res) => res.json());
          const endMetadataFetch = performance.now();
          console.log(`[PERF] Customer List Metadata HTTP Fetch for ID ${tokenId}: ${(endMetadataFetch - startMetadataFetch).toFixed(2)} ms`);


          const docAttr = metadata.attributes?.find(a => a.trait_type === "Documentation");
          const pdfUrl = docAttr ? `${baseGatewayUrl}${docAttr.value.replace("ipfs://", "")}` : null;

          const isOwned = owner.toLowerCase() === account.toLowerCase();
          
          return {
            tokenId: tokenId.toString(),
            name: metadata.name,
            description: metadata.description,
            image: metadata.image.replace("ipfs://", baseGatewayUrl),
            location: metadata.attributes?.find(a => a.trait_type === "Manufacturing Location")?.value || "Unknown",
            pdf: pdfUrl,
            available: availableTokenIds.includes(tokenId),
            owner,
            metadataURI: metadataUrl,
            buyer: isOwned ? owner : undefined,
            seller: isOwned ? registryProduct.manufacturer : undefined,
          };
        } catch (error) {
          // Log the error but don't stop the whole loading process
          console.error(`Error loading product ${tokenId}:`, error);
          return null;
        }
      });
      
      // ✅ Sequential loading to mitigate rate limiting on Pinata gateway
      const loadedProducts = [];
      for (const promise of productPromises) {
          const product = await promise;
          if (product !== null) {
              loadedProducts.push(product);
          }
      }

      // Filter products into marketplace and owned inventory
      setProducts(loadedProducts.filter(p => p.available && p.owner.toLowerCase() !== account.toLowerCase()));
      setOwnedProducts(loadedProducts.filter(p => p.owner.toLowerCase() === account.toLowerCase()));

      // === PERFORMANCE CHECK END: Total Customer Data Load ===
      const endTime = performance.now();
      console.log(`[PERF] TOTAL CUSTOMER DATA LOAD TIME: ${(endTime - startTime).toFixed(2)} ms`);

    } catch (error) {
      alert(`Failed to load customer data: ${error.message}`);
    }

    setLoading(false);
  };

  useEffect(() => { loadCustomerData(); }, [contracts, account]); 

  // === Append product journey to existing PDF ===
  async function appendJourneyToPDF(existingPdfUrl, ownershipDetails) {
    // === PERFORMANCE CHECK START: PDF Append Process ===
    const startPdfAppend = performance.now();
    
    // 1. Fetch PDF
    const startPdfFetch = performance.now();
    const response = await fetch(existingPdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch existing PDF: ${response.statusText}`);
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const endPdfFetch = performance.now();
    console.log(`[PERF] Existing PDF Fetch Time: ${(endPdfFetch - startPdfFetch).toFixed(2)} ms`);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([600, 800]);
    let y = 760;

    page.drawText("Product Journey & Ownership Update", {
      x: 50, y, size: 16, font, color: rgb(0, 0.5, 0.2)
    });
    y -= 30;

    page.drawText(`Token ID: ${ownershipDetails.tokenId}`, { x: 50, y, size: 12, font }); y -= 20;
    page.drawText(`Manufacturer: ${ownershipDetails.manufacturer}`, { x: 50, y, size: 12, font }); y -= 20;
    page.drawText(`Buyer: ${ownershipDetails.buyer}`, { x: 50, y, size: 12, font }); y -= 20;
    page.drawText(`Delivery Location: ${ownershipDetails.delivery}`, { x: 50, y, size: 12, font }); y -= 30;

    page.drawText("Tracking Journey:", { x: 50, y, size: 14, font, color: rgb(0, 0.3, 0.7) });
    y -= 25;

    ownershipDetails.journey.forEach((step, index) => {
      page.drawText(`${index + 1}. ${step.step} — ${step.location}`, { x: 60, y, size: 11, font });
      y -= 20;
    });

    page.drawText(`Updated: ${new Date().toLocaleString()}`, { x: 50, y: y - 10, size: 10, font });

    const newPdfBytes = await pdfDoc.save();
    const updatedPdfFile = new File([newPdfBytes], `Updated_${Date.now()}.pdf`, { type: "application/pdf" });

    // 2. Upload new PDF
    const startPdfUpload = performance.now();
    const upload = await uploadToPinata(updatedPdfFile);
    const endPdfUpload = performance.now();
    console.log(`[PERF] Updated PDF Upload Time: ${(endPdfUpload - startPdfUpload).toFixed(2)} ms (New CID: ${upload.cid})`);

    // === PERFORMANCE CHECK END: PDF Append Process ===
    const endPdfAppend = performance.now();
    console.log(`[PERF] TOTAL PDF APPEND & UPLOAD TIME: ${(endPdfAppend - startPdfAppend).toFixed(2)} ms`);
    
    return upload.url;
  }

  // === Purchase Flow + PDF/Metadata Update ===
  const buyProductAndEmbedJourney = async (tokenId) => {
    if (!customerLocation.trim()) {
      alert("Please enter your delivery location");
      return;
    }

    if (!contracts.productRegistry || !contracts.productNFT) {
      alert("Contracts not initialized");
      return;
    }

    setLoading(true);
    // === PERFORMANCE CHECK START: Total Purchase Process ===
    const startTime = performance.now();

    const purchasedProduct = products.find(p => p.tokenId === tokenId);
    const originalSellerAddress = purchasedProduct?.owner;

    try {
      const registryAddress = contracts.productRegistry.address || contracts.productRegistry.target;
      const onChainOwner = await contracts.productNFT.ownerOf(tokenId);
      const approvedAddress = await contracts.productNFT.getApproved(tokenId);
      const isOperator = await contracts.productNFT.isApprovedForAll(onChainOwner, registryAddress);

      if (onChainOwner.toLowerCase() !== account.toLowerCase()) {
        if (approvedAddress.toLowerCase() !== registryAddress.toLowerCase() && !isOperator) {
          alert("❌ Manufacturer has not approved registry for transfer.");
          setLoading(false);
          return;
        }
      }

      // 1️⃣ Transfer ownership
      // === PERFORMANCE CHECK START: Buy Transaction (On-chain) ===
      const startBuyTx = performance.now();
      const buyTx = await contracts.productRegistry.buyProduct(tokenId);
      const receipt = await buyTx.wait();
      const endBuyTx = performance.now();
      console.log(`[PERF] Buy Transaction Time (On-chain): ${(endBuyTx - startBuyTx).toFixed(2)} ms (Gas Used: ${receipt.gasUsed.toString()})`);


      // 2️⃣ Build journey data
      const journey = [
        { step: "Manufactured", location: "Manufacturing Facility" },
        { step: "Dispatched", location: "Distribution Center" },
        { step: "In Transit", location: "Highway Hub" },
        { step: "Out for Delivery", location: "Local Delivery Center" },
        { step: "Delivered", location: customerLocation }
      ];

      const ownershipDetails = {
        tokenId,
        manufacturer: originalSellerAddress,
        buyer: account,
        delivery: customerLocation,
        journey,
      };

      // 3️⃣ Update PDF on Pinata (Performance tracked inside helper)
      const newPdfUrl = await appendJourneyToPDF(purchasedProduct.pdf, ownershipDetails);
      const newPdfCid = new URL(newPdfUrl).pathname.split("/").pop(); 

      // 4️⃣ Update metadata JSON (Performance tracked inside helper)
      const oldMetadataUrl = purchasedProduct.metadataURI;
      const newMetadataCid = await uploadUpdatedMetadata(oldMetadataUrl, newPdfCid);

      // 5️⃣ Update NFT metadata on-chain
      // === PERFORMANCE CHECK START: Update Token URI Transaction (On-chain) ===
      const startUpdateUriTx = performance.now();
      const newMetadataURI = `ipfs://${newMetadataCid}`;
      const updateTx = await contracts.productNFT.updateTokenURI(tokenId, newMetadataURI);
      const updateReceipt = await updateTx.wait();
      const endUpdateUriTx = performance.now();
      console.log(`[PERF] Update Token URI Transaction Time (On-chain): ${(endUpdateUriTx - startUpdateUriTx).toFixed(2)} ms (Gas Used: ${updateReceipt.gasUsed.toString()})`);

      // 6️⃣ Update UI
      setOwnedProducts(prev => [
        ...prev,
        { ...purchasedProduct, buyer: account, seller: originalSellerAddress, available: false, pdf: newPdfUrl }
      ]);
      setProducts(prev => prev.filter(p => p.tokenId !== tokenId));

      alert("✅ Purchase complete! Certificate updated on Pinata & metadata synced on blockchain.");
      setSelectedProduct(null);
    } catch (error) {
      console.error("Purchase failed:", error);
      alert(`Purchase failed: ${error.message}`);
    }

    setLoading(false);
    // === PERFORMANCE CHECK END: Total Purchase Process ===
    const endTime = performance.now();
    console.log(`[PERF] TOTAL PURCHASE PROCESS TIME: ${(endTime - startTime).toFixed(2)} ms`);
  };

  // === UI ===
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-green-400">AgriTrade</h1>
            <h2 className="text-xl font-extrabold text-white uppercase">Customer Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectionStatus status={connectionStatus} />
            <button onClick={() => setRole('')} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md">
              Switch Role
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">Account: {account}</p>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
        
        {/* AVAILABLE PRODUCTS (MARKETPLACE) */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Available Products</h2>
            <button onClick={loadCustomerData} disabled={loading || connectionStatus !== 'connected'} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md text-sm">
              {loading ? 'Loading...' : 'Refresh Marketplace'}
            </button>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No products available</p>
            ) : (
              products.map(product => (
                <div key={product.tokenId} className="border border-gray-600 rounded-lg p-4 bg-gray-700 bg-opacity-50">
                  <div className="flex items-start space-x-4">
                    <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{product.name}</h3>
                      <p className="text-sm text-gray-400">{product.description}</p>
                      <p className="text-sm text-gray-400">Manufacturer: {product.owner.slice(0, 6)}...{product.owner.slice(-4)}</p>
                      {product.pdf && (
                        <div className="mt-2 border-t border-gray-600 pt-2">
                          <p className="text-sm text-gray-300 mb-1">Certificate:</p>
                          <QRCodeCanvas value={product.pdf} size={80} bgColor="#fff" fgColor="#000" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(product)} 
                      disabled={loading} 
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm rounded-md">
                      Buy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* OWNED PRODUCTS & PURCHASE FORM */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 space-y-6">
          {selectedProduct && (
            <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
              <h3 className="font-medium text-green-300 mb-2 text-xl">Purchase: {selectedProduct.name}</h3>
              <label className="block text-sm text-gray-300 mb-1">Delivery Location</label>
              <input
                type="text"
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
                className="w-full p-2 mb-3 border border-gray-600 rounded-md bg-gray-700 text-white"
                placeholder="Enter your address"
              />
              <button
                onClick={() => buyProductAndEmbedJourney(selectedProduct.tokenId)}
                disabled={loading || !customerLocation.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2 px-4 rounded-md">
                {loading ? 'Processing...' : 'Purchase & Embed Journey'}
              </button>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4 text-white">Your Owned Products ({ownedProducts.length})</h2>
            <div className="space-y-4 max-h-72 overflow-y-auto">
            {ownedProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No products purchased yet.</p>
            ) : (
              ownedProducts.map(product => (
                <div key={product.tokenId} className="border border-green-600 rounded-lg p-3 bg-green-900 bg-opacity-30">
                  <h3 className="font-medium text-green-300">{product.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">Buyer: {product.buyer?.slice(0,6)}...{product.buyer?.slice(-4)}</p>
                  <p className="text-xs text-gray-400">Seller: {product.seller?.slice(0,6)}...{product.seller?.slice(-4)}</p>
                  {product.pdf && (
                    <div className="mt-3 border-t border-gray-700 pt-2 text-center">
                      <p className="text-xs text-gray-300 mb-1">Updated Certificate:</p>
                      <a href={product.pdf} target="_blank" rel="noopener noreferrer">
                        <QRCodeCanvas value={product.pdf} size={70} bgColor="#fff" fgColor="#000" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;