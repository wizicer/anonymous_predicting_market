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
| `npm run chain:deploy` | Deploy contracts to localhost |
| `npm run compile` | Compile Solidity contracts |
| `npm run test` | Run contract tests |
| `npm run build:circuits` | Build ZK circuits |
| `npm run build:artifacts` | Generate contract artifacts for UI |
| `npm run build:ui` | Build the UI |
| `npm run build` | Full build (compile + artifacts + UI) |
| `npm run dev:ui` | Start UI dev server |
| `npm run zip:circuits` | Create circuits.zip from ui/public/circuits |

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

## GitHub Pages Deployment

The project uses GitHub Actions for automatic deployment to GitHub Pages.

### How it works

1. On push to `main` branch, the workflow:
   - Downloads `circuits.zip` from the latest GitHub release
   - Extracts circuits to `ui/public/circuits`
   - Builds contracts and UI
   - Deploys to GitHub Pages

2. A 404 redirect trick enables SPA routing (page refresh works on all routes)

### Managing Circuits Files

Circuit files are large and cannot be stored in the git repository. They are distributed via GitHub Releases.

#### Initial Setup (First Time)

1. Build the circuits locally:
   ```bash
   npm run build:circuits
   ```

2. Copy circuit outputs to `ui/public/circuits/`:
   - `.wasm` files (WebAssembly circuits)
   - `.zkey` files (proving keys)
   - `verification_key.json` files

3. Create the circuits zip:
   ```bash
   npm run zip:circuits
   ```

4. Create a GitHub Release and upload `circuits.zip` as a release asset

#### Updating Circuits

When circuit code changes, maintainers need to:

1. **Rebuild circuits:**
   ```bash
   npm run build:circuits
   ```

2. **Update the circuit files in `ui/public/circuits/`**

3. **Create new zip:**
   ```bash
   npm run zip:circuits
   ```

4. **Create a new GitHub Release:**
   - Go to repository → Releases → "Create a new release"
   - Create a new tag (e.g., `v1.0.1` or `circuits-v2`)
   - Upload `circuits.zip` as a release asset
   - Publish the release

5. **Trigger deployment:**
   - Push to `main` branch, or
   - Manually run the workflow from Actions tab

The GitHub Actions workflow will automatically download `circuits.zip` from the latest release during deployment.

### Hidden Pages

- `/deploy` - Contract deployment page (accessible via URL only, no navigation link)
