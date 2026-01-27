// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Wrapper is Ownable, ERC721{
    error NotNFTowner();
    error InvalidRecipient();
    error InvalidAddress();
    error InsufficientTokenBalance();

    event Wrapped(address indexed payer, address indexed recipient, uint256 indexed tokenId, uint256 amount);
    event Unwrapped(address indexed owner, uint256 indexed tokenId, uint256 amount);

    IERC20 public immutable token;

    uint256 public tokensPerNFT;
    uint256 private _tokenIdCounter;

    constructor (address tokenAddress, uint256 _tokensPerNFT) ERC721("Wrapped Synthetic NFT", "wSYN") Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert InvalidAddress(); 

        token = IERC20(tokenAddress);
        tokensPerNFT = _tokensPerNFT;
    }

    function setTokensPerNFT(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert InsufficientTokenBalance();
        tokensPerNFT = newAmount;
    }

    function wrap() external {
        _wrap(msg.sender, msg.sender);
    }

    function wrapTo(address recipient) external {
        if (recipient == address(0)) revert InvalidRecipient();
        
        _wrap(msg.sender, recipient);
    }

    function unwrap(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotNFTowner();

        _burn(tokenId);
        token.transfer(msg.sender, tokensPerNFT);

        emit Unwrapped(msg.sender, tokenId, tokensPerNFT);
    }

    function _wrap(address payer, address recipient) internal {
        if (token.balanceOf(payer) < tokensPerNFT) revert InsufficientTokenBalance();

        token.transferFrom(payer, address(this), tokensPerNFT);

        _tokenIdCounter++;

        _safeMint(recipient, _tokenIdCounter);
        emit Wrapped(payer, recipient, _tokenIdCounter, tokensPerNFT);
    }
}