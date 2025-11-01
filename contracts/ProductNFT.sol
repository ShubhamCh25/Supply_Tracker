// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ProductNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => address) public tokenManufacturer;

    event ProductMinted(uint256 indexed tokenId, address indexed manufacturer, string metadataCID);
    event ProductTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event TokenURIUpdated(uint256 indexed tokenId, string oldURI, string newURI);

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
        address from = ownerOf(tokenId);
        _transfer(from, to, tokenId);
        emit ProductTransferred(tokenId, from, to);
    }

    function updateTokenURI(uint256 tokenId, string memory newCID) public {
        require(_exists(tokenId), "Token does not exist");
        require(_isApprovedOrOwner(msg.sender, tokenId), "Only owner or approved can update");

        string memory oldURI = tokenURI(tokenId);
        string memory newURI = string(abi.encodePacked("ipfs://", newCID));

        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, oldURI, newURI);
    }

    function getManufacturer(uint256 tokenId) public view returns (address) {
        return tokenManufacturer[tokenId];
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete tokenManufacturer[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}