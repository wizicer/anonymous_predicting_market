import { BrowserProvider, Contract, parseEther } from 'ethers';
import { PREDICTION_MARKET_ABI, MarketStatus, Outcome, marketStatusToString, outcomeToString } from '@/contracts/abi';
import deployment from '@/contracts/deployment.json';
import type { Market, CommitteeMember } from '@/types';

let provider: BrowserProvider | null = null;
let contract: Contract | null = null;

export function getProvider(): BrowserProvider {
  if (!provider && typeof window !== 'undefined' && window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
  }
  if (!provider) {
    throw new Error('No ethereum provider available');
  }
  return provider;
}

export function getContract(): Contract {
  if (!contract) {
    const p = getProvider();
    contract = new Contract(deployment.predictionMarket, PREDICTION_MARKET_ABI, p);
  }
  return contract;
}

export async function getSignedContract(): Promise<Contract> {
  const p = getProvider();
  const signer = await p.getSigner();
  return new Contract(deployment.predictionMarket, PREDICTION_MARKET_ABI, signer);
}

// ==================== Market Functions ====================

export async function createMarket(
  question: string,
  description: string,
  salt: bigint,
  expiresAt: bigint,
  minCommittee: number,
  requiredCommittee: number,
  requiredReputation: number
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.createMarket(
    question,
    description,
    salt,
    expiresAt,
    minCommittee,
    requiredCommittee,
    requiredReputation
  );
  await tx.wait();
}

export async function activateMarket(
  marketId: bigint,
  pkX: string,
  pkY: string,
  pkCommitment: string
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.activateMarket(marketId, pkX, pkY, pkCommitment);
  await tx.wait();
}

// ==================== Committee Functions ====================

export async function joinCommittee(
  marketId: bigint,
  commitment: bigint
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.joinCommittee(marketId, commitment);
  await tx.wait();
}

export async function submitKeyShare(
  marketId: bigint,
  key: bigint
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.submitKeyShare(marketId, key);
  await tx.wait();
}

// ==================== Betting Functions ====================

export async function placeEncryptedBet(
  marketId: bigint,
  commitment: string,
  cypherText: string,
  a: [bigint, bigint],
  b: [[bigint, bigint], [bigint, bigint]],
  c: [bigint, bigint],
  publicSignals: bigint[],
  amountEth: string
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.placeEncryptedBet(
    marketId,
    commitment,
    cypherText,
    a,
    b,
    c,
    publicSignals,
    { value: parseEther(amountEth) }
  );
  await tx.wait();
}

// ==================== Oracle Functions ====================

export async function submitOutcome(
  marketId: bigint,
  outcome: number // 1 = Yes, 2 = No
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.submitOutcome(marketId, outcome);
  await tx.wait();
}

// ==================== Batch Open Functions ====================

export async function batchOpenAndResolve(
  marketId: bigint,
  a: [bigint, bigint],
  b: [[bigint, bigint], [bigint, bigint]],
  c: [bigint, bigint],
  publicSignals: bigint[]
): Promise<void> {
  const contract = await getSignedContract();
  const tx = await contract.batchOpenAndResolve(marketId, a, b, c, publicSignals);
  await tx.wait();
}

// ==================== View Functions ====================

export async function getMarketCount(): Promise<bigint> {
  const contract = getContract();
  return await contract.marketCount();
}

interface RawMarketData {
  question: string;
  description: string;
  salt: bigint;
  status: bigint;
  expiresAt: bigint;
  minCommittee: bigint;  
  requiredCommittee: bigint;   
  requiredReputation: bigint;  
  betCount: bigint;            
  publicKeyX: string;
  publicKeyY: string;
  publicKeyCommitment: string;
  outcome: bigint;             // enum returned as bigint
  oracleSubmittedAt: bigint;
}

export async function getMarket(marketId: bigint): Promise<Market> {
  const contract = getContract();
  const data: RawMarketData = await contract.markets(marketId);
  const committee = await getCommitteeMembers(marketId);
  
  const status = marketStatusToString(Number(data.status));
  const outcome = outcomeToString(Number(data.outcome));
  
  return {
    id: marketId.toString(),
    question: data.question,
    description: data.description,
    category: 'other', // Not stored on-chain
    status,
    expiresAt: new Date(Number(data.expiresAt) * 1000),
    createdAt: new Date(), // Not stored on-chain
    resolvedAt: status === 'resolved' ? new Date() : undefined,
    outcome,
    yesPercentage: 0, // Calculated after resolution
    noPercentage: 0,
    totalVolume: 0, // Would need to track from events
    totalBets: Number(data.betCount),
    committee,
    minimumCommittee: Number(data.minCommittee),
    requiredCommittee: Number(data.requiredCommittee),
    requiredReputation: Number(data.requiredReputation),
    publicKey: data.publicKeyX !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
      ? data.publicKeyX + data.publicKeyY.slice(2) 
      : undefined,
    bets: [], // Would need to fetch from events or separate calls
  };
}

export async function getCommitteeMembers(marketId: bigint): Promise<CommitteeMember[]> {
  const contract = getContract();
  const addresses: string[] = await contract.getCommittee(marketId);
  
  const members: CommitteeMember[] = await Promise.all(
    addresses.map(async (address) => {
      const commitment = await contract.getCommitteeCommitment(marketId, address);
      const key = await contract.getCommitteeKey(marketId, address);
      return {
        address,
        reputation: 0, // Not stored on-chain
        keyShareSubmitted: commitment !== 0n,
        decryptionSubmitted: key !== 0n,
      };
    })
  );
  
  return members;
}

export async function getAllMarkets(): Promise<Market[]> {
  const count = await getMarketCount();
  const markets: Market[] = [];
  
  for (let i = 0n; i < count; i++) {
    const market = await getMarket(i);
    markets.push(market);
  }
  
  return markets;
}

export function isDeployed(): boolean {
  return deployment.predictionMarket !== '';
}

// ==================== Bet Data Functions ====================

export interface BetData {
  bettor: string;
  commitment: string;
  cypherText: string;
  amount: bigint;
  timestamp: bigint;
  verified: boolean;
}

export async function getBetCount(marketId: bigint): Promise<number> {
  const contract = getContract();
  return Number(await contract.getBetCount(marketId));
}

export async function getBet(marketId: bigint, betId: number): Promise<BetData> {
  const contract = getContract();
  const [bettor, commitment, cypherText, amount, timestamp, verified] = await contract.getBet(marketId, betId);
  return { bettor, commitment, cypherText, amount, timestamp, verified };
}

export async function getAllBets(marketId: bigint): Promise<BetData[]> {
  const count = await getBetCount(marketId);
  const bets: BetData[] = [];
  for (let i = 0; i < count; i++) {
    const bet = await getBet(marketId, i);
    bets.push(bet);
  }
  return bets;
}

export async function getCommitteeKeys(marketId: bigint): Promise<{ address: string; key: bigint }[]> {
  const contract = getContract();
  const addresses: string[] = await contract.getCommittee(marketId);
  
  const keys = await Promise.all(
    addresses.map(async (address) => {
      const key = await contract.getCommitteeKey(marketId, address);
      return { address, key };
    })
  );
  
  return keys;
}

export { MarketStatus, Outcome };
