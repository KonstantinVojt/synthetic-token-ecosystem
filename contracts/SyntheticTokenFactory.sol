// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ISyntheticTokenFactory} from "./ISyntheticTokenFactory.sol";
import {SyntheticToken} from "./SyntheticToken.sol";

contract SyntheticTokenFactory is Ownable, ISyntheticTokenFactory {

    SyntheticInfo[] public syntheticTokens;
    mapping(address => bool) public isSyntheticToken;

    constructor() Ownable(msg.sender) {}

    function createSyntheticToken(string calldata name, string calldata symbol) external onlyOwner returns (address) {
        SyntheticToken token = new SyntheticToken(
            name,
            symbol,
            address(this)
        );
        token.transferOwnership(msg.sender);

        syntheticTokens.push(
            SyntheticInfo({
                token: address(token),
                name: name,
                symbol: symbol
            })
        );

        isSyntheticToken[address(token)] = true;

        emit SyntheticTokenCreated(address(token), msg.sender, name, symbol);

        return address(token);
    }

    function syntheticTokensCount() external view returns (uint256) {
        return syntheticTokens.length;
    }
}