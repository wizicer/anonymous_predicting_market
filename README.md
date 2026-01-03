# Anonymous Prediction Market

A prediction market with encrypted bets using threshold encryption and zero-knowledge proofs.

## Development Setup

### Prerequisites
- Node.js 18+
- MetaMask browser extension

### Installation

```bash
# Install root dependencies (hardhat, etc.)
npm install

# Install UI dependencies
cd ui && npm install
```

### Local Development

1. **Start local blockchain:**
   ```bash
   npm run chain
   ```
   This starts a Hardhat node at `http://127.0.0.1:8545`

2. **Deploy contracts (in a new terminal):**
   ```bash
   npm run deploy
   ```
   This deploys the contracts and saves addresses to `ui/src/contracts/deployment.json`

3. **Configure MetaMask:**
   - Add network: `http://127.0.0.1:8545` with Chain ID `31337`
   - Import a test account using one of the private keys from the Hardhat node output

4. **Start UI (in a new terminal):**
   ```bash
   cd ui && npm run dev
   ```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run chain` | Start local Hardhat blockchain |
| `npm run deploy` | Deploy contracts to localhost |
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run contract tests |
| `npm run build:circuits` | Build ZK circuits |

### Project Structure

```
├── contracts/           # Solidity smart contracts
│   ├── prediction.sol   # Main prediction market contract
│   └── MockVerifiers.sol # Mock verifiers for local dev
├── circuits/            # Circom ZK circuits
├── scripts/             # Deployment scripts
├── ui/                  # React frontend
│   └── src/
│       ├── contracts/   # ABI and deployment config
│       ├── services/    # Contract service & provers
│       └── pages/       # React pages
└── hardhat.config.ts    # Hardhat configuration
```

### Contract Functions

- **createMarket**: Create a new prediction market
- **joinCommittee**: Join as a committee member
- **activateMarket**: Activate market with public key
- **placeEncryptedBet**: Place an encrypted bet with ZK proof
- **submitOutcome**: Oracle submits market outcome
- **submitKeyShare**: Committee submits decryption key
- **batchOpenAndResolve**: Batch decrypt and resolve market
