// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IStaking} from "./interfaces/IStaking.sol";

contract Staking is Ownable, IStaking, IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;


    uint256 public constant ONE_YEAR = 365 days;

    IERC721 public immutable nft;
    IERC20 public immutable rewardToken;

    uint256 public stakingRate = 1 ether;
    uint256 public totalStakedNFTs;

    mapping(uint256 => address) public stakerOf;
    mapping(address => uint256[]) public stakedNFTs;
    mapping(address => Rewards) public rewards;

    constructor(address nftAddress, address rewardTokenAddress) Ownable(msg.sender) {
        if (nftAddress == address(0)) revert InvalidAddress();
        if (rewardTokenAddress == address(0)) revert InvalidAddress();

        nft = IERC721(nftAddress);
        rewardToken = IERC20(rewardTokenAddress);
    }

    function stake(uint256 tokenId) external override nonReentrant {
        if (stakerOf[tokenId] != address(0)) revert AlreadyStaked();

        _updateRewards(msg.sender);

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        stakerOf[tokenId] = msg.sender;
        stakedNFTs[msg.sender].push(tokenId);
        totalStakedNFTs++;

        emit Staked(msg.sender, tokenId);
    }

    function unstake(uint256 tokenId) external override nonReentrant {
        if (stakerOf[tokenId] != msg.sender) revert NotStaker();

        _updateRewards(msg.sender);

        stakerOf[tokenId] = address(0);
        _removeTokenId(msg.sender, tokenId);
        totalStakedNFTs--;

        nft.safeTransferFrom(address(this), msg.sender, tokenId);

        emit UnStaked(msg.sender, tokenId);
    }

    function claim() external override nonReentrant {
        _updateRewards(msg.sender);

        uint256 reward = rewards[msg.sender].claimable;
        if (reward == 0) revert NoAmount();

        if (rewardToken.balanceOf(address(this)) < reward) {
            revert InsufficientRewards();
        }

        rewards[msg.sender].claimable = 0;
        rewards[msg.sender].claimed += reward;

        rewardToken.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function pendingRewards(address user) external view returns (uint256) {
        Rewards memory userRewards = rewards[user];
        uint256 staked = stakedNFTs[user].length;

        if (userRewards.lastClaimTimestamp == 0 || staked == 0) {
            return userRewards.claimable;
        }

        uint256 timePassed = block.timestamp - userRewards.lastClaimTimestamp;
        uint256 pending = (staked * stakingRate * timePassed) / ONE_YEAR;

        return userRewards.claimable + pending;
    }

    function canClaim(address user) external view returns (bool) {
        uint256 pending = this.pendingRewards(user);

        if (pending == 0) return false;
        if (rewardToken.balanceOf(address(this)) < pending) return false;

        return true;
    }

    function setStakingRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidRate();
        if (_hasActiveStakes()) revert ActiveStakes();

        uint256 oldRate = stakingRate;
        stakingRate = newRate;

        emit StakingRateUpdated(oldRate, newRate);
    }

    function _updateRewards(address user) internal {
        Rewards storage userRewards = rewards[user];
        uint256 staked = stakedNFTs[user].length;

        if (userRewards.lastClaimTimestamp == 0) {
            userRewards.lastClaimTimestamp = block.timestamp;
            return;
        }

        uint256 timePassed = block.timestamp - userRewards.lastClaimTimestamp;

        if (staked > 0) {
            uint256 reward = (staked * stakingRate * timePassed) / ONE_YEAR;
            userRewards.claimable += reward;
        }

        userRewards.lastClaimTimestamp = block.timestamp;
    }

    function _removeTokenId(address user, uint256 tokenId) internal {
        uint256[] storage tokens = stakedNFTs[user];
        uint256 len = tokens.length;

        for (uint256 i = 0; i < len; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[len - 1];
                tokens.pop();
                return;
            }
        }
    }

    function _hasActiveStakes() internal view returns (bool) {
        return totalStakedNFTs > 0;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external view override returns (bytes4) {
        if (msg.sender != address(nft)) revert InvalidAddress();
        return IERC721Receiver.onERC721Received.selector;
    }
}
