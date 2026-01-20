// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IStaking { 
    struct Rewards {
        uint256 lastClaimTimestamp;
        uint256 claimable;
        uint256 claimed;
    }

    error NoAmount();
    error InsufficientFunds();

    event Staked(address indexed user, uint256 amount);
    event UnStaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
}