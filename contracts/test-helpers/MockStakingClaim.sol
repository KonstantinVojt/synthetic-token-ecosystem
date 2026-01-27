/**
 * @dev Test-only contract used for coverage and reentrancy testing.
 * NOT FOR PRODUCTION USE.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockStakingClaim {
    function claim() external {
        // intentionally empty
    }
}
