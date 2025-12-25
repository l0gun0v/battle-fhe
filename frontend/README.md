# Battleship FHE - Frontend 🎮

A modern, responsive web application for playing Battleship with on-chain privacy, built with **Next.js**, **Wagmi**, and **Zama's FHEVM Relayer SDK**.


## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Blockchain Interface**: Wagmi / Viem
- **FHE Integration**: `@zama-fhe/relayer-sdk`

## Development

### Prerequisites
- Node.js >= 20
- A configured FHEVM network (e.g., Zama Sepolia or Local Node)

### Setup
1. Copy `.env.local.example` to `.env.local` and fill in your RPC and Project IDs.
2. `npm install`
3. `npm run dev`

### Production Build
`npm run build`
