// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISyntheticToken {
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}
