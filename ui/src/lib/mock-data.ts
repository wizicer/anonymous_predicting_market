import type { Market, UserBet, OracleSubmission, EncryptedBet, CommitteeMember, BetPosition } from '@/types';

// Helper to generate random hex string
const randomHex = (length: number): string => {
  return '0x' + Array.from({ length }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// Helper to generate random address
const randomAddress = (): string => randomHex(40);

// Mock committee members
const generateCommittee = (count: number, submitted: boolean = false): CommitteeMember[] => 
  Array.from({ length: count }, () => ({
    address: randomAddress(),
    reputation: Math.floor(Math.random() * 500) + 100,
    keyShareSubmitted: submitted,
    decryptionSubmitted: false,
  }));

// Mock encrypted bets
const generateBets = (count: number, revealed: boolean = false): EncryptedBet[] =>
  Array.from({ length: count }, (_, i) => {
    const position: BetPosition = Math.random() > 0.5 ? 'yes' : 'no';
    return {
      id: `bet-${i}-${randomHex(8)}`,
      bettor: randomAddress(),
      commitment: randomHex(64),
      encryptedData: randomHex(128),
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      ...(revealed
        ? {
            position,
            amount: Math.floor(Math.random() * 10) + 0.1,
            proof: Math.floor(Math.random() * 10) <= 2 ? "" : randomHex(256),
          }
        : {}),
    };
  });

// Mock markets data
export const mockMarkets: Market[] = [
  {
    id: 'market-1',
    question: 'Will Bitcoin reach $150,000 by end of 2025?',
    description: 'This market resolves YES if Bitcoin (BTC) reaches or exceeds $150,000 USD on any major exchange before December 31, 2025 23:59 UTC.',
    category: 'crypto',
    status: 'active',
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date('2024-11-01'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 125.5,
    totalBets: 47,
    committee: generateCommittee(5, true),
    minimumCommittee: 3,
    requiredCommittee: 5,
    requiredReputation: 100,
    publicKey: randomHex(128),
    bets: generateBets(47, true),
  },
  {
    id: 'market-2',
    question: 'Will Ethereum 2.0 staking rewards exceed 5% APY in Q1 2025?',
    description: 'Resolves YES if the average ETH staking reward exceeds 5% APY during Q1 2025.',
    category: 'crypto',
    status: 'preparing',
    expiresAt: new Date('2025-03-31'),
    createdAt: new Date('2024-12-01'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 0,
    totalBets: 0,
    committee: generateCommittee(4, true),
    minimumCommittee: 3,
    requiredCommittee: 5,
    requiredReputation: 150,
    bets: [],
  },
  {
    id: 'market-3',
    question: 'Will the US Federal Reserve cut interest rates in January 2025?',
    description: 'This market resolves YES if the Federal Reserve announces an interest rate cut at their January 2025 FOMC meeting.',
    category: 'finance',
    status: 'expired',
    expiresAt: new Date('2025-01-31'),
    createdAt: new Date('2024-10-15'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 89.2,
    totalBets: 32,
    committee: generateCommittee(4, true),
    minimumCommittee: 3,
    requiredCommittee: 5,
    requiredReputation: 100,
    publicKey: randomHex(128),
    bets: generateBets(32, true),
  },
  {
    id: 'market-4',
    question: 'Will SpaceX successfully land Starship on Mars by 2026?',
    description: 'Resolves YES if SpaceX successfully lands a Starship vehicle on Mars before January 1, 2027.',
    category: 'technology',
    status: 'active',
    expiresAt: new Date('2026-12-31'),
    createdAt: new Date('2024-09-01'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 234.8,
    totalBets: 89,
    committee: generateCommittee(6, true),
    minimumCommittee: 3,
    requiredCommittee: 6,
    requiredReputation: 200,
    publicKey: randomHex(128),
    bets: generateBets(89, true),
  },
  {
    id: 'market-5',
    question: 'Will AI pass the Turing Test by end of 2024?',
    description: 'Resolves YES if any AI system is officially recognized as passing the Turing Test by a reputable institution.',
    category: 'technology',
    status: 'resolved',
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-15'),
    resolvedAt: new Date('2025-01-02'),
    outcome: 'no',
    yesPercentage: 35,
    noPercentage: 65,
    totalVolume: 567.3,
    totalBets: 203,
    committee: generateCommittee(5, true),
    minimumCommittee: 3,
    requiredCommittee: 5,
    requiredReputation: 100,
    publicKey: randomHex(128),
    bets: generateBets(203, true),
  },
  {
    id: 'market-6',
    question: 'Will a major country adopt Bitcoin as legal tender in 2025?',
    description: 'Resolves YES if any G20 country officially adopts Bitcoin as legal tender during 2025.',
    category: 'crypto',
    status: 'preparing',
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date('2024-12-05'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 0,
    totalBets: 0,
    committee: generateCommittee(1, false),
    minimumCommittee: 3,
    requiredCommittee: 4,
    requiredReputation: 100,
    bets: [],
  },
  {
    id: 'market-7',
    question: 'Will the next US President be a Democrat?',
    description: 'Resolves YES if the winner of the 2024 US Presidential Election is from the Democratic Party.',
    category: 'politics',
    status: 'resolved',
    expiresAt: new Date('2024-11-15'),
    createdAt: new Date('2024-06-01'),
    resolvedAt: new Date('2024-11-10'),
    outcome: 'no',
    yesPercentage: 48,
    noPercentage: 52,
    totalVolume: 1234.5,
    totalBets: 456,
    committee: generateCommittee(7, true),
    minimumCommittee: 5,
    requiredCommittee: 7,
    requiredReputation: 150,
    publicKey: randomHex(128),
    bets: generateBets(456, true),
  },
  {
    id: 'market-8',
    question: 'Will Solana flip Ethereum in market cap by 2025?',
    description: 'Resolves YES if Solana market cap exceeds Ethereum market cap at any point during 2025.',
    category: 'crypto',
    status: 'expired',
    expiresAt: new Date('2025-01-15'),
    createdAt: new Date('2024-08-01'),
    yesPercentage: 0,
    noPercentage: 0,
    totalVolume: 78.9,
    totalBets: 28,
    committee: [
      { address: randomAddress(), reputation: 250, keyShareSubmitted: true, decryptionSubmitted: true },
      { address: randomAddress(), reputation: 180, keyShareSubmitted: true, decryptionSubmitted: true },
      { address: randomAddress(), reputation: 320, keyShareSubmitted: true, decryptionSubmitted: false },
      { address: randomAddress(), reputation: 150, keyShareSubmitted: true, decryptionSubmitted: false },
    ],
    minimumCommittee: 3,
    requiredCommittee: 5,
    requiredReputation: 100,
    publicKey: randomHex(128),
    bets: generateBets(28, true),
  },
];

// Mock user bets (for connected wallet)
export const mockUserBets: UserBet[] = [
  {
    id: 'user-bet-1',
    marketId: 'market-1',
    marketQuestion: 'Will Bitcoin reach $150,000 by end of 2025?',
    position: 'yes',
    amount: 2.5,
    status: 'pending',
    timestamp: new Date('2024-11-15'),
  },
  {
    id: 'user-bet-2',
    marketId: 'market-5',
    marketQuestion: 'Will AI pass the Turing Test by end of 2024?',
    position: 'no',
    amount: 1.0,
    status: 'won',
    timestamp: new Date('2024-08-20'),
  },
  {
    id: 'user-bet-3',
    marketId: 'market-7',
    marketQuestion: 'Will the next US President be a Democrat?',
    position: 'yes',
    amount: 0.5,
    status: 'lost',
    timestamp: new Date('2024-10-01'),
  },
];

// Mock oracle submissions
export const mockOracleSubmissions: OracleSubmission[] = [
  {
    id: 'oracle-1',
    marketId: 'market-5',
    marketQuestion: 'Will AI pass the Turing Test by end of 2024?',
    outcome: 'no',
    proofUrl: 'https://example.com/proof/ai-turing-test-2024',
    submittedAt: new Date('2025-01-01'),
    effectiveAt: new Date('2025-01-02'),
    submitter: '0x1234...5678',
  },
  {
    id: 'oracle-2',
    marketId: 'market-7',
    marketQuestion: 'Will the next US President be a Democrat?',
    outcome: 'no',
    proofUrl: 'https://example.com/proof/us-election-2024',
    submittedAt: new Date('2024-11-09'),
    effectiveAt: new Date('2024-11-10'),
    submitter: '0xabcd...efgh',
  },
];

// Get markets by status
export const getMarketsByStatus = (status: Market['status']): Market[] => 
  mockMarkets.filter(m => m.status === status);

// Get market by ID
export const getMarketById = (id: string): Market | undefined => 
  mockMarkets.find(m => m.id === id);

// Get markets awaiting oracle
export const getMarketsAwaitingOracle = (): Market[] => 
  mockMarkets.filter(m => m.status === 'expired' );
