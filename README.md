# Anonymous Prediction Market

A "dark" prediction market with encrypted bets using threshold encryption and zero-knowledge proofs, preventing copy-trading and front-running.

## The Problem

Current blockchain prediction markets (like Polymarket) suffer from radical transparency. Since all bets are visible on-chain, large traders ("whales") are easily tracked, leading to copy-trading, front-running, and game-theoretic manipulation before an event settles.

## Our Solution

We built a **"Dark" Prediction Market** where users can wager on outcomes without revealing their positions to anyone—not even the validators—until the betting phase is over.

## Key Innovations & Technology

- **First Practical "Dark Market" MVP:** We present the first functional prototype of an **Anonymous Prediction Market**. Unlike existing platforms (e.g., Polymarket), our system keeps all betting positions completely hidden until the event concludes, effectively preventing copy-trading and front-running strategies.

- **Browser-Native P2P DKG:** We implemented a secure **Distributed Key Generation (DKG)** protocol purely in the browser. By leveraging **WebRTC**, committee members establish direct Peer-to-Peer connections to securely generate and fragment keys without relying on centralized coordination servers.

- **Ephemeral Keys for Async Decryption:** We utilize **ephemeral private keys** to significantly simplify the decryption workflow. This design removes the requirement for all committee members to be online simultaneously for multi-round interactive decryption, allowing for flexible and robust off-chain key recovery.

- **Novel Privacy Encoding:** We do not simply encrypt a "Yes/No" boolean. Instead, we encode the betting direction into the **parity** (odd/even nature) of a random elliptic curve point. This ensures the ciphertext looks mathematically indistinguishable from random noise.

- **Zero-Knowledge Betting:** Users generate a **ZK-Bet Proof** locally (using SnarkJS). This proves the bet is valid and backed by funds without disclosing the direction, ensuring total privacy.

- **Threshold Security:** A decentralized committee performs Distributed Key Generation (DKG). The private key is fragmented, so no single entity can decrypt the market prematurely.

- **Gas-Efficient Settlement:** Instead of expensive on-chain decryption for every bet, the committee decrypts off-chain and submits a single **Batch Opening Proof** to verify the aggregate results and payouts, significantly reducing gas costs.

## Business Model

Our model aligns incentives to sustain a decentralized, private market:

- **Protocol Fees (Revenue):** We charge a small percentage fee on the winning pot upon settlement. Users are essentially paying a "privacy premium" for copy-trading protection and MEV resistance.

- **Committee Incentives (Cost):** A portion of these fees is automatically distributed to committee members. This incentivizes honest participation in key generation and ensures timely off-chain decryption.

## Roadmap

- **Phase 1: MVP (Completed ✅)** We have successfully deployed the core privacy loop, including `PredictionMarket.sol`, functional ZK circuits (`ZK-Bet`, `Batch-Open`), and a React frontend with client-side proving.

- **Phase 2: Decentralization & Variety (Next Step)** We will implement a decentralized Oracle mechanism to ensure trustless resolution and enrich prediction options to support diverse market types.

- **Phase 3: Advanced Features (Future)** We plan to upgrade to Non-Interactive DKG to minimize coordination friction and enable support for complex reward curves for more sophisticated market dynamics.

## Compliance Declaration

**No / Not Applicable.** The Anonymous Prediction Market is a **decentralized protocol** designed to facilitate privacy-preserving information discovery.

## Live Demo

- **Contract Address:** [0xd6a0485F847f93263808cA0b0c2C0F4Ca9E19a3a](https://sepolia.mantlescan.xyz/address/0xd6a0485F847f93263808cA0b0c2C0F4Ca9E19a3a#code) on Mantle Sepolia
- **Frontend:** [https://wizicer.github.io/anonymous_predicting_market/](https://wizicer.github.io/anonymous_predicting_market/)

## Technical Protocol

The Anonymous Prediction Market operates through three main phases:

### 1. Committee Setup
- A decentralized committee of `n` members with threshold `t` performs Distributed Key Generation (DKG)
- Generates shared private key `sk` and public key `pk` where `pk = g^sk`
- At least `t` members must collaborate to recover the private key for decryption

### 2. Betting Phase
- Users encode betting direction into elliptic curve point parity: `side_i = (m_i.X mod 2)`
- Generate ElGamal threshold encryption: `ct_i = (v_i, e_i)` where `v_i = g^β_i, e_i = m_i + pk^β_i`
- Create Poseidon commitment: `comm_i = Poseidon(m_i || side_i || salt || amount_i || address_i)`
- Generate ZK proof proving bet validity without revealing direction
- Submit `(address_i, amount_i, ct_i, comm_i, π_i)` on-chain

### 3. Batch Opening Phase
- Committee decrypts all bets off-chain using recovered private key
- Generate batch ZK proof for all decrypted bets
- Submit aggregated amounts `(sum_0, sum_1)` and batch proof on-chain
- Oracle provides winning direction for settlement and reward distribution

**For detailed mathematical specifications and cryptographic proofs, see the [complete protocol documentation](docs/protocol.md).**

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
