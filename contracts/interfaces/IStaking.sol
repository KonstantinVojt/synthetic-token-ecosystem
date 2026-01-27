// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IStaking {
    struct Rewards {
        uint256 lastClaimTimestamp;
        uint256 claimable;
        uint256 claimed;
    }

    error NoAmount();
    error InvalidAddress();
    error NotStaker();
    error InsufficientRewards();
    error AlreadyStaked();
    error InvalidRate();
    error ActiveStakes();

    event Staked(address indexed user, uint256 tokenId);
    event UnStaked(address indexed user, uint256 tokenId);
    event RewardClaimed(address indexed user, uint256 amount);
    event StakingRateUpdated(uint256 oldRate, uint256 newRate);

    function stake(uint256 tokenId) external;
    function unstake(uint256 tokenId) external;
    function claim() external;
}