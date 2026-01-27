/**
 * @dev Test-only contract used for coverage and reentrancy testing.
 * NOT FOR PRODUCTION USE.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IStakingClaim {
    function claim() external;
}

contract ReentrantClaimERC20 is ERC20 {
    IStakingClaim public staking;
    bool internal entered;

    constructor() ERC20("ReentrantClaimToken", "RCT") {}

    function setStaking(address staking_) external {
        staking = IStakingClaim(staking_);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount)
        public
        override
        returns (bool)
    {
        if (!entered && msg.sender == address(staking)) {
            entered = true;
            staking.claim();
        }

        return super.transfer(to, amount);
    }
}
