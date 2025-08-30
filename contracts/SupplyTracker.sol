// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SupplyTracker is ERC721, Ownable {
    uint public nextTokenId = 1;

    struct Order {
        uint tokenId;
        address customer;
        string status; // e.g. Placed, Shipped, Delivered
    }

    // ✅ Store metadata URIs manually
    mapping(uint => string) private _tokenURIs;

    // ✅ Store orders
    mapping(uint => Order) public orders;

    constructor() ERC721("SupplyNFT", "SNFT") Ownable(msg.sender) {}

    // Manufacturer mints product NFT
    function mintProduct(address to, string memory uri) external onlyOwner {
        uint tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // ✅ Custom setter (instead of removed _setTokenURI)
    function _setTokenURI(uint tokenId, string memory uri) internal {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _tokenURIs[tokenId] = uri;
    }

    // ✅ Override tokenURI to return stored value
    function tokenURI(uint tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    // Customer places order (linked to NFT)
    function placeOrder(uint tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        orders[tokenId] = Order(tokenId, msg.sender, "Placed");
    }

    // Manufacturer updates order status
    function updateOrder(uint tokenId, string memory newStatus) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        orders[tokenId].status = newStatus;
    }

    // Get order details
    function getOrder(uint tokenId) external view returns (Order memory) {
        return orders[tokenId];
    }
}
