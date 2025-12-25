# Battleship FHE - Smart Contracts (Chain)

This directory contains the Solidity smart contracts for the Battleship FHE game, powered by **fhevm**.

## Core Contracts

### `BattleshipGame.sol`
The main game logic handler. It manages:
- **Game Lifecycle**: `WaitingForOpponent` -> `WaitingForPlacements` -> `InProgress` -> `Finished`.
- **FHE State**: Stores player boards as encrypted masks.
- **Move Logic**: Processes moves using FHE operators to determine hits/misses without revealing the board.
- **Winner Validation**: Ensures the game only finishes when a player has successfully sunk all opponent ships.

### `BattleshipFactory.sol`
A factory contract to deploy new game instances easily.

## Development

### Prerequisites
- Node.js >= 20
- FHEVM-compatible hardhat environment

### Commands
- **Compile**: `npm run compile`
- **Test**: `npm run test`
- **Deploy (Local)**: `npm run deploy:localhost`

## Security & Privacy
The contract uses `FHE.allow` to strictly control which addresses can request decryption of specific handles. Only the participants of a game are authorized to decrypt their respective board data.
