# SplitDot

On-chain group expense splitting with AI receipt scanning, built on Polkadot Hub EVM.

## Problem

Splitting expenses among friends is painful. Existing apps are centralized, balances are just numbers in a database, and settlement requires bank transfers or third-party payment apps. There's no transparency, no verifiability, and no programmable settlement.

## Solution

SplitDot brings group expense management on-chain with USDC stablecoin settlement on Polkadot Hub. An AI receipt scanner extracts amounts and line items from photos, making expense entry frictionless.

**Key features:**

- **On-chain ledger** -- Groups, expenses, and balances stored on Polkadot Hub EVM with full transparency
- **AI Receipt Scanner** -- Snap a photo, AI extracts amount, merchant, category, and line items
- **Net Settlement** -- Greedy algorithm minimizes the number of transfers needed to settle a group
- **USDC Settlement** -- One-click stablecoin settlement, no bank transfers needed
- **Equal or Custom Split** -- Split expenses equally or assign custom amounts per member

## Architecture

```
Frontend (React + Wagmi)
    |
    |--- AI Receipt Scanner (OpenAI Vision API)
    |
    v
Polkadot Hub EVM (Chain ID: 420420417)
    |
    |--- GroupLedger.sol   -- Groups, expenses, balance tracking
    |--- Settlement.sol    -- Net settlement algorithm + USDC transfers
    |--- MockUSDC.sol      -- Test ERC-20 stablecoin (6 decimals)
```

### Smart Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| GroupLedger | `0x4fbD3a48AE0C49d5c023059Ed4eb22E3674723CB` | Group creation, expense recording, balance tracking |
| Settlement | `0xc75542854D9f17c569465d36cA9a7E1A73e8bb31` | Net settlement calculation and USDC transfer execution |
| MockUSDC | `0x46028eec7e121C573f2Df3F865b1F5706b5B9c35` | Test USDC token with 6 decimals |

All contracts deployed on **Polkadot Hub Testnet**.

### Net Settlement Algorithm

The settlement contract implements a greedy matching algorithm that minimizes the number of USDC transfers:

1. Calculate each member's net balance (what they're owed minus what they owe)
2. Separate into creditors (positive balance) and debtors (negative balance)
3. Greedily match the largest debtor with the largest creditor
4. Repeat until all balances are zero

For a group of N people, this reduces worst-case O(N^2) transfers to at most N-1.

## Tech Stack

**Smart Contracts:**
- Solidity 0.8.28
- Hardhat + @parity/hardhat-polkadot
- OpenZeppelin Contracts v5

**Frontend:**
- React 19 + TypeScript
- Vite 7 + Tailwind CSS v4
- Wagmi v3 + viem (wallet connection & contract interaction)
- Lucide React (icons)

**AI:**
- OpenAI-compatible Vision API (gpt-4o-mini)
- Receipt image parsing with structured JSON extraction

## Getting Started

### Prerequisites

- Node.js >= 22
- MetaMask or any injected wallet
- PAS tokens for gas (get from [Polkadot Faucet](https://faucet.polkadot.io/?parachain=assethubpolkadot))

### Smart Contracts

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Polkadot Hub Testnet
cp .env.example .env
# Edit .env with your private key
npx hardhat run scripts/deploy.ts --network polkadotHub
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure AI scanner (optional)
cp .env.example .env
# Edit .env with your API key

# Start dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 in your browser.

### Connect Wallet

1. Install MetaMask
2. Add Polkadot Hub Testnet:
   - RPC: `https://eth-rpc-testnet.polkadot.io`
   - Chain ID: `420420417`
   - Currency: PAS
3. Get test PAS from faucet
4. Click "Connect" in SplitDot

## User Flow

1. **Connect wallet** -- Click Connect, approve in MetaMask
2. **Create a group** -- Add member addresses, confirm on-chain
3. **Add expenses** -- Enter amount manually or scan a receipt with AI
4. **View balances** -- See who owes whom in real-time
5. **Settle up** -- One-click USDC settlement with optimized transfers

## Project Structure

```
contracts/
  GroupLedger.sol       # Group and expense management
  Settlement.sol        # Net settlement + USDC transfers
  MockUSDC.sol          # Test stablecoin
test/
  GroupLedger.test.ts   # Contract test suite
scripts/
  deploy.ts             # Deployment script
frontend/
  src/
    components/         # Shared UI components
    contracts/          # ABIs and addresses
    lib/                # Utilities, wagmi config, AI scanner, toast
    pages/              # 5 page components
    App.tsx             # Router
    main.tsx            # Entry point with providers
```

## License

MIT
