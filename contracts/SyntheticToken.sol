// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISyntheticToken} from "./interfaces/ISyntheticToken.sol";

contract SyntheticToken is Ownable, ERC20, ISyntheticToken{
    constructor(string memory name_, string memory symbol_, address factory_) ERC20(name_, symbol_) Ownable(factory_) {}

    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _mint(to, amount);
        emit Minted(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _burn(from, amount);
        emit Burned(from, amount);
    }
}