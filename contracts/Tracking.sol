


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Tracking {
    struct TrackingInfo {
        uint256 tokenId;
        string step;
        string location;
        uint256 timestamp;
    }
    
    // Mapping from token ID to array of tracking checkpoints
    mapping(uint256 => TrackingInfo[]) public trackingHistory;
    
    // Mapping to check if tracking is active for a token
    mapping(uint256 => bool) public isTracking;
    
    event Checkpoint(
        uint256 indexed tokenId, 
        string step, 
        string location, 
        uint256 timestamp,
        uint256 checkpointIndex
    );
    
    event TrackingStarted(uint256 indexed tokenId, address indexed customer);
    event TrackingCompleted(uint256 indexed tokenId);
    
    function startTracking(uint256 tokenId, address customer) public {
        require(!isTracking[tokenId], "Tracking already started");
        
        isTracking[tokenId] = true;
        
        emit TrackingStarted(tokenId, customer);
    }
    
    function addCheckpoint(
        uint256 tokenId, 
        string memory step, 
        string memory location
    ) public {
        require(isTracking[tokenId], "Tracking not started for this product");
        
        TrackingInfo memory checkpoint = TrackingInfo({
            tokenId: tokenId,
            step: step,
            location: location,
            timestamp: block.timestamp
        });
        
        trackingHistory[tokenId].push(checkpoint);
        
        emit Checkpoint(
            tokenId, 
            step, 
            location, 
            block.timestamp,
            trackingHistory[tokenId].length - 1
        );
        
        // If this is the final step, mark tracking as complete
        if (keccak256(abi.encodePacked(step)) == keccak256(abi.encodePacked("Delivered"))) {
            isTracking[tokenId] = false;
            emit TrackingCompleted(tokenId);
        }
    }
    
    function getTrackingHistory(uint256 tokenId) public view returns (TrackingInfo[] memory) {
        return trackingHistory[tokenId];
    }
    
    function getLatestCheckpoint(uint256 tokenId) public view returns (TrackingInfo memory) {
        require(trackingHistory[tokenId].length > 0, "No tracking history");
        return trackingHistory[tokenId][trackingHistory[tokenId].length - 1];
    }
    
    function isProductTracking(uint256 tokenId) public view returns (bool) {
        return isTracking[tokenId];
    }
}
