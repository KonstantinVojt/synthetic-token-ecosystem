// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISyntheticTokenFactory {
    struct SyntheticInfo {
        address token;
        string name;
        string symbol;
    }

    error UnknownSynthetic();
    error EmptyName();
    error EmptySymbol();
    error DuplicateName();
    error DuplicateSymbol();

    event SyntheticTokenCreated(address indexed token, address indexed owner, string name, string symbol);
    
    function createSyntheticToken(string calldata name, string calldata symbol) external returns (address);
    function syntheticTokensCount() external view returns (uint256);
}