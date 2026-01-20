// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import  {IStaking} from "./IStaking.sol";

contract Staking is Ownable, IStaking {
    IERC20 public immutable token;

    uint256 public stakingRate = 10;
    uint256 constant ONE_YEAR = 365 days;

    mapping(address => uint256) public balances;
    mapping(address => Rewards) rewards;

    constructor (address tokenAddress) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
    } 

    function stake(uint256 amount) external {
        if (amount == 0) revert NoAmount();

        _updateRewards(msg.sender);

        balances[msg.sender] += amount;
        token.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function unStake(uint256 amount) external {
        if (amount == 0) revert NoAmount();
        if (amount > balances[msg.sender]) revert InsufficientFunds();

        _updateRewards(msg.sender);

        balances[msg.sender] -= amount;
        token.transfer(msg.sender, amount);

        emit UnStaked(msg.sender, amount);
    }

    function claim() external {
        _updateRewards(msg.sender);

        uint256 reward = rewards[msg.sender].claimable;      
        if (reward == 0) revert NoAmount(); 

        rewards[msg.sender].claimable = 0;
        rewards[msg.sender].claimed += reward; 

        token.transfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);

    }

    function _updateRewards(address user) internal {
        Rewards storage userRewards = rewards[user];

        if (userRewards.lastClaimTimestamp == 0) {
            userRewards.lastClaimTimestamp = block.timestamp;
            return;
        }

        uint256 timePassed = block.timestamp - userRewards.lastClaimTimestamp;
        uint256 staked = balances[user];

        if (staked > 0 ) {
            uint256 reward = (staked * stakingRate * timePassed) / (ONE_YEAR * 100);

            userRewards.claimable += reward;
        }

        userRewards.lastClaimTimestamp = block.timestamp;
    }
}
