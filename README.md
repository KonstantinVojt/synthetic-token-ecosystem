# Synthetic Token Ecosystem

## Overview

This project implements a **synthetic token ecosystem** built with Solidity and Hardhat.

It demonstrates interaction between multiple smart contracts, secure NFT-based staking,
factory deployment patterns, and comprehensive testing (unit + integration).

The system is designed as an educational and portfolio-grade example of:

- ERC20 token mechanics
- Factory pattern
- ERC721 wrapping
- NFT-based staking with time-based rewards
- Reentrancy protection
- Defensive input validation
- Full test coverage

---

## Architecture

### Smart Contracts

| Contract                | Description |
|------------------------|-------------|
| `SyntheticToken`        | ERC20 synthetic token with controlled mint & burn |
| `SyntheticTokenFactory` | Factory that deploys and tracks synthetic tokens |
| `Wrapper`               | ERC721 wrapper that locks ERC20 tokens into NFTs |
| `Staking`               | ERC721 NFT staking contract with linear rewards |

---

## Contracts Description

### SyntheticToken (ERC20)

- Based on OpenZeppelin ERC20
- Minting and burning restricted to owner
- Ownership is initially assigned to the factory and then transferred to the creator
- Explicit validation:
  - zero address is rejected
  - zero amount is rejected
- Used both as:
  - wrapped asset for NFTs
  - reward token for staking

---

### SyntheticTokenFactory

- Deploys new `SyntheticToken` contracts
- Prevents invalid deployments:
  - empty `name` or `symbol`
  - duplicate `name`
  - duplicate `symbol` (case-insensitive)
- Normalizes token symbols (lowercase → uppercase)
- Tracks all created tokens
- Emits events for off-chain indexing

---

### Wrapper (ERC721)

ERC721 contract that wraps ERC20 tokens into NFTs.

Each NFT represents a fixed amount of ERC20 tokens.

Features:
- Validates token address in constructor
- Checks sufficient ERC20 balance before wrapping
- Supports:
  - `wrap()` — wraps ERC20 tokens into an NFT for the caller
  - `wrapTo()` — wraps ERC20 tokens into an NFT for a specified recipient
- Unwrap flow:
  - burns the corresponding NFT
  - transfers ERC20 tokens
- Configurable `tokensPerNFT` via owner-only function

---

### Staking (ERC721-based)

Main staking contract that allows users to stake **ERC721 NFTs** to earn ERC20 rewards.

Key features:
- NFT-based staking (ERC721)
- Linear reward accrual over time
- Reentrancy protection using `ReentrancyGuard`
- Tracks:
  - staked NFTs
  - claimable rewards
  - claimed rewards
- Includes view helpers:
  - `pendingRewards()` — check rewards without claiming
  - `canClaim()` — helper for UI / off-chain logic
- Balance check before reward transfer to prevent unexpected reverts
- Configurable `stakingRate` (only when no active stakes)

---

## Project Structure

contracts/
 ├─ SyntheticToken.sol
 ├─ SyntheticTokenFactory.sol
 ├─ Wrapper.sol
 ├─ Staking.sol
 ├─ interfaces/
 │   ├─ ISyntheticToken.sol
 │   ├─ ISyntheticTokenFactory.sol
 │   └─ IStaking.sol
 └─ test-helpers/
     ├─ MockERC721.sol
     ├─ MockStakingClaim.sol
     ├─ ReentrantStakeERC721.sol
     ├─ ReentrantUnstakeERC721.sol
     └─ ReentrantClaimERC20.sol

test/
 ├─ SyntheticToken.test.js
 ├─ SyntheticTokenFactory.test.js
 ├─ Wrapper.test.js
 ├─ Staking.test.js
 ├─ MockStakingClaim.test.js
 └─ integration/
     └─ FullFlow.test.js

---

## Testing Strategy

### Unit Tests

Unit tests cover all business logic and edge cases.

Explicitly tested scenarios include:
- invalid inputs
- access control enforcement
- reward accounting correctness
- reentrancy protection

Reentrancy attacks are simulated using dedicated test-only malicious contracts.

The test suite achieves:
- 100% statement coverage
- 100% branch coverage
- full coverage of all critical business logic

---

### Integration Test

The `FullFlow` integration test verifies the complete user journey:

1. Deploy factory
2. Create synthetic ERC20 token
3. Mint tokens
4. Wrap tokens into ERC721 NFT
5. Stake NFT
6. Simulate time passing
7. Claim staking rewards
8. Unstake NFT

This confirms correct interaction between all contracts in a real usage scenario.

---

## Installation

```bash
git clone <repository-url>
cd <repository-name>
npm install
```

---

## Compile Contracts

```bash
npx hardhat compile
```

---

## Run Tests

```bash
npx hardhat test
```

All unit tests and integration tests should pass.

---

## Test Coverage

```bash
npx hardhat coverage
```

Coverage goals:

* 100% statements
* 100% branches
* Full coverage for business logic

---

## Technologies Used

* Solidity ^0.8.19
* OpenZeppelin Contracts v5
* Hardhat
* Ethers.js
* Mocha & Chai
* Hardhat Coverage

---

## Security Considerations

* OpenZeppelin audited contracts
* Custom errors for gas efficiency
* Strict access control via `Ownable`
* Restricted configuration changes via ownership
* No unsafe external calls
* Reentrancy attack scenarios explicitly tested using malicious contracts
* Test-only attack contracts are isolated from production code

---

## License

MIT

## Author 

https://github.com/KonstantinVojt
