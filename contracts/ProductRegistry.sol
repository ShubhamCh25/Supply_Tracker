// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ProductNFT.sol";

contract ProductRegistry {
    ProductNFT public productNFT;
    
    struct Product {
        uint256 tokenId;
        address manufacturer;
        bool available;
        uint256 listedAt;
    }
    
    mapping(uint256 => Product) public products;
    uint256[] public allProducts;
    
    event ProductRegistered(uint256 indexed tokenId, address indexed manufacturer);
    event ProductRemoved(uint256 indexed tokenId);
    event ProductPurchased(uint256 indexed tokenId, address indexed buyer, address indexed manufacturer);
    
    constructor(address _productNFTAddress) {
        productNFT = ProductNFT(_productNFTAddress);
    }
    
    function registerProduct(uint256 tokenId) public {
        require(productNFT.ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        require(products[tokenId].tokenId == 0, "Product already registered");
        
        products[tokenId] = Product({
            tokenId: tokenId,
            manufacturer: msg.sender,
            available: true,
            listedAt: block.timestamp
        });
        
        allProducts.push(tokenId);
        
        emit ProductRegistered(tokenId, msg.sender);
    }
    
    function removeProduct(uint256 tokenId) public {
        require(products[tokenId].manufacturer == msg.sender, "Not the manufacturer");
        require(products[tokenId].available, "Product already unavailable");
        
        products[tokenId].available = false;
        
        emit ProductRemoved(tokenId);
    }
    
    function buyProduct(uint256 tokenId) public {
        require(products[tokenId].available, "Product not available");
        address manufacturer = products[tokenId].manufacturer;
        address buyer = msg.sender;

        productNFT.safeTransferFrom(manufacturer, buyer, tokenId);

        products[tokenId].available = false;

        emit ProductPurchased(tokenId, buyer, manufacturer);
    }

    function getAvailableProducts() public view returns (uint256[] memory) {
        uint256 availableCount = 0;
        
        for (uint256 i = 0; i < allProducts.length; i++) {
            if (products[allProducts[i]].available) {
                availableCount++;
            }
        }
        
        uint256[] memory availableProducts = new uint256[](availableCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allProducts.length; i++) {
            if (products[allProducts[i]].available) {
                availableProducts[currentIndex] = allProducts[i];
                currentIndex++;
            }
        }
        
        return availableProducts;
    }
    
    function getProductsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 ownedCount = 0;
        
        for (uint256 i = 0; i < allProducts.length; i++) {
            try productNFT.ownerOf(allProducts[i]) returns (address tokenOwner) {
                if (tokenOwner == owner) {
                    ownedCount++;
                }
            } catch {
                // Token might not exist anymore, skip
            }
        }
        
        uint256[] memory ownedProducts = new uint256[](ownedCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < allProducts.length; i++) {
            try productNFT.ownerOf(allProducts[i]) returns (address tokenOwner) {
                if (tokenOwner == owner) {
                    ownedProducts[currentIndex] = allProducts[i];
                    currentIndex++;
                }
            } catch {
                // Token might not exist anymore, skip
            }
        }
        
        return ownedProducts;
    }
    
    function getProduct(uint256 tokenId) public view returns (Product memory) {
        return products[tokenId];
    }
}