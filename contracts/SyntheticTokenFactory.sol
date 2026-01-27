// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISyntheticTokenFactory} from "./interfaces/ISyntheticTokenFactory.sol";
import {SyntheticToken} from "./SyntheticToken.sol";

contract SyntheticTokenFactory is Ownable, ISyntheticTokenFactory {
    SyntheticInfo[] public syntheticTokens;
    mapping(address => bool) public isSyntheticToken;
    mapping(bytes32 => bool) public symbolExists;
    mapping(bytes32 => bool) public nameExists;

    constructor() Ownable(msg.sender) {}

    function createSyntheticToken(string calldata name, string calldata symbol) external onlyOwner returns (address) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(symbol).length == 0) revert EmptySymbol();

        string memory normalizedSymbol = _normalizeSymbol(symbol);
        
        bytes32 symbolHash = keccak256(bytes(normalizedSymbol));
        if (symbolExists[symbolHash]) revert DuplicateSymbol();

        bytes32 nameHash = keccak256(bytes(name));
        if (nameExists[nameHash]) revert DuplicateName();

        SyntheticToken token = new SyntheticToken(
            name,
            normalizedSymbol,
            address(this)
        );
        token.transferOwnership(msg.sender);

        syntheticTokens.push(
            SyntheticInfo({
                token: address(token),
                name: name,
                symbol: normalizedSymbol
            })
        );

        nameExists[nameHash] = true;
        symbolExists[symbolHash] = true;
        isSyntheticToken[address(token)] = true;

        emit SyntheticTokenCreated(address(token), msg.sender, name, symbol);
        return address(token);
    }

    function _normalizeSymbol(string memory symbol) internal pure returns (string memory) {
        bytes memory b = bytes(symbol);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) {
                // a-z → A-Z
                b[i] = bytes1(uint8(b[i]) - 32);
            }
        }
        return string(b);
    }

    function syntheticTokensCount() external view returns (uint256) {
        return syntheticTokens.length;
    }
}