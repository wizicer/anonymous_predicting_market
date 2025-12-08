# Anonymous Prediction Market - Requirements Document

## Overview

A proof-of-concept prediction market platform focused on **anonymous betting** using specialized cryptography (threshold encryption and zero-knowledge proofs). The system ensures bet privacy until market resolution while maintaining verifiability.


## Core Concepts

### Anonymity Model
- All bets are encrypted using threshold encryption before submission
- positions (YES/NO) remain hidden until market resolution
- Only encrypted commitments along with its amount and pseudo-identity are visible on-chain during active betting
- After expired, committee member disclose their ephemaral session private key on-chain, everyone are allowed to decrypt the bets and submit proof to settle payouts.

### Market Lifecycle

```
PREPARING → ACTIVE → EXPIRED → DECRYPTING → RESOLVED
```

| Status | Description |
|--------|-------------|
| **Preparing** | Market created, awaiting committee formation |
| **Active** | Committee threshold met, accepting encrypted bets |
| **Expired** | Betting closed, awaiting ground truth and decryption |
| **Decrypting** | Committee submitting their ephermal key |
| **Resolved** | Ground truth applied, bets revealed, payouts available |

## User Roles

### 1. Bettor (General User)
- Connect wallet to authenticate
- Browse active and resolved markets
- Place anonymous bets (YES/NO) on active markets
- View own bet history (only own bets visible to self)

### 2. Committee Member
- Join markets in "preparing" status
- Contribute key shares for threshold encryption
- Submit ephemeral session private key after market expiration
- Generate and upload ZK proofs for decryption validity

### 3. Oracle
- Submit ground truth for expired markets
- Provide optional proof/documentation/link
- Ground truth takes effect after 24-hour delay period


## Pages & Features

### 1. Home Page (`/`)
- Hero section explaining anonymous betting concept
- Market listings organized by status:
  - **Preparing**: Showing committee formation progress
  - **Active**: Accepting bets (no probability shown - encrypted)
  - **Resolved**: Showing final results and outcomes
- Navigation to all other pages

### 2. Market Detail Page (`/market/[id]`)
- Market question and metadata
- Status-dependent display:
  - **Preparing**: Committee formation progress, join button
  - **Active**: Encrypted indicator (no YES/NO ratio visible), betting panel, encrypted bets list
  - **Resolved**: Final outcome, revealed bets with ZK verification badge
- Stats: Total volume, number of bets, time remaining, expiration date
- Committee member list (addresses truncated)
- Betting panel (for active markets, requires wallet connection)

### 3. Create Market Page (`/create`)
- Form fields:
  - Question (required, pre-filled default)
  - Description (optional)
  - Category dropdown
  - Expiration date/time
  - Committee requirements:
    - Minimum committee size (default: 3)
    - Required reputation score (default: 100)
- Market lifecycle explanation
- Creates market in "preparing" status

### 4. Committee Page (`/committee`)

#### Tab 1: Key Generation
- List of markets in "preparing" status
- For each market:
  - Committee formation progress (X/Y members)
  - "Join as Committee" button
  - "Contribute Key Share" button (after joining)
- Threshold encryption explanation

#### Tab 2: Decryption (Committee Members Only)
- List of expired markets where user is committee member
- Three-step decryption workflow:
  1. **Decrypt Locally**: Download encrypted bets, run local decryption with key share
  2. **Generate Proof**: Create ZK proof that decryption was performed correctly
  3. **Upload Results**: Submit decrypted data and proof to chain
- Progress indicator for each step
- Status badges (Pending/Completed)

### 5. Oracle Page (`/oracle`)
- List of markets awaiting ground truth
- Submission form:
  - Select outcome (YES/NO)
  - Optional proof URL/documentation
- 24-hour delay notice before taking effect
- History of submitted resolutions

### 6. Bet History (Component in Header/Profile)
- User's own bets across all markets
- Shows: Market question, position, amount, status (Won/Lost/Pending)
- Accessible only when wallet connected


## Technical Requirements

### Wallet Integration
- Connect/disconnect wallet functionality (work with metamask)
- Persist connection across page navigation (localStorage)
- Display truncated address in header
- Required for: betting, committee actions, oracle submissions

### Cryptography (POC Simulation)
- **Threshold Encryption**: Committee collaboratively generates public key; requires threshold of members to decrypt
- **ZK Proofs**: Prove correct decryption without revealing private key shares
- **Encrypted Commitments**: Bets stored as encrypted blobs with commitment hashes

### Data Model

```typescript
interface Market {
  id: string
  question: string
  description: string
  category: string
  status: 'preparing' | 'active' | 'expired' | 'resolved'
  expiresAt: Date
  resolvedAt?: Date
  outcome?: 'yes' | 'no'
  yesPercentage: number      // Only revealed after resolution
  noPercentage: number       // Only revealed after resolution
  totalVolume: number
  totalBets: number
  committee: CommitteeMember[]
  requiredCommittee: number
  requiredReputation: number
  publicKey?: string         // Generated after committee formation
  bets: EncryptedBet[]
}

interface CommitteeMember {
  address: string
  reputation: number
  keyShareSubmitted: boolean
  decryptionSubmitted: boolean
}

interface EncryptedBet {
  id: string
  commitment: string         // Hash commitment
  encryptedData: string      // Encrypted bet details
  timestamp: Date
  // Revealed after resolution:
  position?: 'yes' | 'no'
  amount?: number
  proof?: string             // ZK proof of valid decryption
}
```


## UI/UX Requirements

### Visual Theme
- Dark mode, crypto-native aesthetic
- Monospace fonts for addresses, hashes, and commitments
- Color coding for bet positions (Green=YES, Red=NO)
- Encryption indicators and ZK-PROOF badges

### Anonymity Emphasis
- Before resolution:
  - No YES/NO probability bar (replaced with "ENCRYPTED" indicator)
  - Bet amounts hidden with `••••••` placeholder
  - Banner explaining encryption status
- After resolution:
  - Full probability bar visible
  - All bet details revealed
  - ZK verification badge on each bet

### Status Indicators
- Preparing: Yellow/amber theme, progress bar for committee
- Active: Green theme, "LIVE" badge
- Expired: Gray theme, "AWAITING RESOLUTION"
- Resolved: Blue/purple theme with outcome badge (YES/NO)


## Security Considerations (Production)

1. **Threshold Requirement**: Minimum T-of-N committee members required for decryption
2. **Reputation System**: Only reputable addresses can join committees
3. **Delay Period**: 24-hour delay on ground truth to allow disputes
4. **ZK Verification**: All decryptions must include verifiable proofs
5. **No Front-Running**: Encrypted bets prevent front-running and manipulation


## Out of Scope (POC)

- Actual smart contract deployment
- Real cryptographic operations (threshold encryption, ZK proofs)
- Token/payment integration
- Dispute resolution mechanism
- Reputation calculation system
- Mobile responsive optimization