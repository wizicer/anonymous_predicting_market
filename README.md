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
| `npm run zip` | Create archive.zip with circuits, contracts, and deployment files |

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
   - Downloads `archive.zip` from the latest GitHub release
   - Extracts files to original positions:
     - `ui/src/contracts/deployment.json` (deployment addresses)
     - `contracts/generated/` (generated verifier contracts)
     - `ui/public/circuits/` (circuit WASM, ZKEY, and verification keys)
   - Builds contracts and UI
   - Deploys to GitHub Pages

2. Uses HashRouter for client-side routing (works on static hosting)

### Managing Circuits Files

Circuit files are large and cannot be stored in the git repository. They are distributed via GitHub Releases.

#### Initial Setup (First Time)

1. Build the circuits locally:
   ```bash
   npm run build:circuits
   ```

2. Deploy contracts to generate deployment.json:
   ```bash
   npm run chain:deploy
   ```

3. Create the archive zip:
   ```bash
   npm run zip
   ```

4. Create a GitHub Release and upload `archive.zip` as a release asset

#### Updating Circuits

When circuit code changes, maintainers need to:

1. **Rebuild circuits:**
   ```bash
   npm run build:circuits
   ```

2. **Update the circuit files in `ui/public/circuits/`**

3. **Redeploy contracts (if needed):**
   ```bash
   npm run chain:deploy
   ```

4. **Create new zip:**
   ```bash
   npm run zip
   ```

5. **Create a new GitHub Release:**
   - Go to repository → Releases → "Create a new release"
   - Create a new tag (e.g., `v1.0.1` or `circuits-v2`)
   - Upload `archive.zip` as a release asset
   - Publish the release

6. **Trigger deployment:**
   - Push to `main` branch, or
   - Manually run the workflow from Actions tab

The GitHub Actions workflow will automatically download `archive.zip` from the latest release during deployment.

### Local Development Note

For local development, you don't need the archive zip. Simply:
1. Run `npm run build:circuits` to generate circuits
2. Run `npm run chain:deploy` to deploy contracts locally
3. Run `npm run dev:ui` to start the UI

The archive zip is only needed for GitHub Pages deployment where generated files are not stored in git.

### Hidden Pages

- `/deploy` - Contract deployment page (accessible via URL only, no navigation link)
- `/algo` - Algorithm test page for encryption/decryption debugging (accessible via URL only, no navigation link)
