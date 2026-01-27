/**
 * @dev Test-only contract used for coverage and reentrancy testing.
 * NOT FOR PRODUCTION USE.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    uint256 private _nextId;

    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to) external returns (uint256) {
        _nextId++;
        _mint(to, _nextId);
        return _nextId;
    }
}
