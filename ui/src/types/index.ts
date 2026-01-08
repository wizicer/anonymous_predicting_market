// Market status types
export type MarketStatus = 'preparing' | 'active' | 'expired' | 'resolved';
export type BetPosition = 'yes' | 'no';

// Committee member interface
export interface CommitteeMember {
  address: string;
  reputation: number;
  keyShareSubmitted: boolean;
  decryptionSubmitted: boolean;
}

// Encrypted bet interface
export interface EncryptedBet {
  id: string;
  bettor: string;
  commitment: string;
  encryptedData: string;
  timestamp: Date;
  // Revealed after resolution
  position?: BetPosition;
  amount?: number;
  proof?: string;
}

// Market interface
export interface Market {
  id: string;
  question: string;
  description: string;
  category: string;
  status: MarketStatus;
  expiresAt: Date;
  createdAt: Date;
  resolvedAt?: Date;
  outcome?: BetPosition;
  yesPercentage: number;
  noPercentage: number;
  totalVolume: number;
  totalBets: number;
  committee: CommitteeMember[];
  minimumCommittee: number;
  requiredCommittee: number;
  requiredReputation: number;
  publicKeyX?: string;
  publicKeyY?: string;
  salt?: bigint;
  bets: EncryptedBet[];
}

// User bet history item
export interface UserBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  position: BetPosition;
  amount: number;
  status: 'pending' | 'won' | 'lost';
  timestamp: Date;
}

// Oracle submission
export interface OracleSubmission {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: BetPosition;
  proofUrl?: string;
  submittedAt: Date;
  effectiveAt: Date;
  submitter: string;
}

// Category type
export type MarketCategory = 
  | 'crypto'
  | 'politics'
  | 'sports'
  | 'technology'
  | 'finance'
  | 'entertainment'
  | 'other';

export const MARKET_CATEGORIES: { value: MarketCategory; label: string }[] = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'politics', label: 'Politics' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];
