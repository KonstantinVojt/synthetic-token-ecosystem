# Synthetic Token Ecosystem

A DeFi ecosystem of 4 interconnected smart contracts built on Ethereum. Allows creating synthetic ERC20 tokens, wrapping them into NFTs, and staking those NFTs for rewards.

## Contracts

### SyntheticTokenFactory
Factory contract that deploys new synthetic ERC20 tokens (e.g. `sGOLD` – "Synthetic Gold").

- Only the owner can create tokens
- Normalizes token symbol to uppercase
- Validates for duplicate names and symbols before deployment
- Transfers ownership of the new token to the caller

### SyntheticToken
A standard ERC20 token where only the owner can call `mint()` and `burn()`.

### Wrapper
Wraps ERC20 tokens into NFTs (ERC721, symbol `wSYN`) and back.

- User deposits a fixed amount of tokens → receives an NFT
- User burns the NFT → receives tokens back
- Supports `wrapTo(address)` – wrap on behalf of another address

### Staking
Stakes NFTs for ERC20 token rewards.

- User deposits an NFT → earns `stakingRate` tokens per year per NFT
- User calls `claim()` → receives accrued tokens
- Protected against reentrancy attacks

## Full Flow

```
Factory creates sGOLD
  → User wraps sGOLD into wSYN NFT
  → User stakes wSYN NFT
  → User claims sGOLD rewards
  → User unstakes NFT
  → User unwraps NFT back to sGOLD
```

## Tech Stack

- Solidity
- Hardhat
- JavaScript
- OpenZeppelin (ERC20, ERC721)
- Ethers.js
- dotenv

## Deployed Contract

Network: **Ethereum Sepolia Testnet**

| Contract | Address |
|---|---|
| SyntheticTokenFactory | [`0x0a69FD25c7530D763126ecaFb4eE62411ef8AbA2`](https://sepolia.etherscan.io/address/0x0a69FD25c7530D763126ecaFb4eE62411ef8AbA2#code) |

## Getting Started

### Prerequisites

- Node.js
- npm
- Hardhat

### Install

```bash
git clone https://github.com/KonstantinVojt/synthetic-token-ecosystem.git
cd synthetic-token-ecosystem
npm install
```

### Configure

Create a `.env` file:

```env
RPC_URL=https://sepolia.infura.io/v3/your_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### Deploy

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Verify on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Testing

```bash
npx hardhat test
npx hardhat coverage
```

Unit tests cover all contracts including edge cases and access control.
Reentrancy attacks are simulated using dedicated malicious contracts.
Integration test (`FullFlow.test.js`) verifies the complete user journey end-to-end.
