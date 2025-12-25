# Battleship FHE 🚢

A privacy-preserving Battleship game built on **fhevm**, leveraging Fully Homomorphic Encryption (FHE) to ensure that ship placements and move results remain encrypted on-chain until explicitly decrypted for the players.

## Project Structure

This repository is organized as a monorepo containing both the smart contracts and the frontend application:

- **[`chain/`](./chain)**: Hardhat-based project for FHEVM smart contracts.
- **[`frontend/`](./frontend)**: Next.js web application for the game interface.

## Key Features

- **On-chain Privacy**: Ship locations are stored as encrypted FHE types.
- **Fair Play**: Move results (hits/misses) are calculated using FHE logic, preventing any player (or the node operator) from seeing the hidden board state.
- **Seamless Decryption**: Automated EIP-712 signature requests for secure, authorized decryption of game state.

## 🚀 Possible Optimizations: Data Fetching & Sync

Currently, the frontend relies on direct RPC polling to stay in sync with the blockchain. For a production-grade experience, the following optimizations are recommended:

### 1. Common Backend / Indexer
Instead of fetching raw state from the RPC on every poll, a specialized backend (using **Subgraph/Graph Node** or a custom **Node.js/Go indexer**) would significantly improve performance:
- **Instant Lobby**: Keep a cached list of active games, reducing the initial load time.
- **Event-Driven UI**: Watch for `MoveMade` or `GameJoined` events and push updates to the client via **WebSockets** or **Server-Sent Events (SSE)**.
- **Metadata Storage**: Store non-critical metadata (player aliases, profile pictures) off-chain.

### 2. Transaction Re-checking
Implementing a robust transaction monitoring service would allow the frontend to stop polling as soon as a transaction is confirmed, rather than waiting for the next periodic refresh cycle.

### 3. Batched FHE Decryption
For games with larger boards or many players, batching multiple decryption handles into a single relayer request (where supported) would reduce Metamask signature fatigue and RPC overhead.

---

Built with ❤️ by the Battleship FHE Team.
