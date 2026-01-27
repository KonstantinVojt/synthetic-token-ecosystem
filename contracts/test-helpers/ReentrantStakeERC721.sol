/**
 * @dev Test-only contract used for coverage and reentrancy testing.
 * NOT FOR PRODUCTION USE.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IStakingReenter {
    function stake(uint256 tokenId) external;
}

contract ReentrantStakeERC721 is ERC721 {
    IStakingReenter public staking;
    bool internal entered;

    constructor() ERC721("MaliciousNFT", "MNFT") {}

    function setStaking(address staking_) external {
        staking = IStakingReenter(staking_);
    }

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        if (!entered && to == address(staking)) {
            entered = true;
            staking.stake(tokenId);
        }
    }
}
