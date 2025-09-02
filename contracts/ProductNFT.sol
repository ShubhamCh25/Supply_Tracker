// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ProductNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Mapping from token ID to manufacturer address
    mapping(uint256 => address) public tokenManufacturer;
    
    event ProductMinted(uint256 indexed tokenId, address indexed manufacturer, string metadataCID);
    
    constructor() ERC721("ProductNFT", "PROD") {}
    
    function mintProduct(string memory metadataCID) public returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", metadataCID)));
        
        tokenManufacturer[tokenId] = msg.sender;
        
        emit ProductMinted(tokenId, msg.sender, metadataCID);
        
        return tokenId;
    }
    
    function transferProduct(uint256 tokenId, address to) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized to transfer");
        _transfer(ownerOf(tokenId), to, tokenId);
    }
    
    function getManufacturer(uint256 tokenId) public view returns (address) {
        return tokenManufacturer[tokenId];
    }
    
    // Override required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}