export const PREDICTION_MARKET_ABI = [
  // Constructor
  "constructor(address _betVerifier, address _batchOpenVerifier)",
  
  // Constants
  "function ORACLE_DELAY() view returns (uint256)",
  
  // Market functions
  "function createMarket(string calldata question, string calldata description, uint256 salt, uint256 expiresAt, uint8 minCommittee, uint8 requiredCommittee, uint8 requiredReputation) external",
  "function activateMarket(uint256 marketId, bytes32 pkX, bytes32 pkY, bytes32 pkCommitment) external",
  
  // Committee functions
  "function joinCommittee(uint256 marketId, uint256 commitment) external",
  "function submitKeyShare(uint256 marketId, uint256 key) external",
  
  // Betting functions
  "function placeEncryptedBet(uint256 marketId, bytes32 commitment, uint256[2] calldata a, uint256[2][2] calldata b, uint256[2] calldata c, uint256[10] calldata publicSignals) external payable",
  
  // Oracle functions
  "function submitOutcome(uint256 marketId, uint8 outcome) external",
  
  // Batch open functions
  "function batchOpenAndResolve(uint256 marketId, uint256[2] calldata a, uint256[2][2] calldata b, uint256[2] calldata c, uint256[23] calldata publicSignals) external",
  
  // View functions
  "function marketCount() external view returns (uint256)",
  "function markets(uint256) external view returns (string question, string description, uint256 salt, uint8 status, uint256 expiresAt, uint8 minCommittee, uint8 requiredCommittee, uint8 requiredReputation, uint32 betCount, bytes32 publicKeyX, bytes32 publicKeyY, bytes32 publicKeyCommitment, uint8 outcome, uint256 oracleSubmittedAt)",
  "function getCommittee(uint256 marketId) external view returns (address[])",
  "function getCommitteeCommitment(uint256 marketId, address member) external view returns (uint256)",
  "function getCommitteeKey(uint256 marketId, address member) external view returns (uint256)",
  "function getBet(uint256 marketId, uint32 betId) external view returns (address bettor, bytes32 commitment, uint256 cypherTextX, uint256 cypherTextY, uint256 ephemeralKeyX, uint256 ephemeralKeyY, uint256 amount, uint256 timestamp, bool verified)",
  "function getBetCount(uint256 marketId) external view returns (uint32)",
] as const;

// Enum mappings matching the contract
export const MarketStatus = {
  Preparing: 0,
  Active: 1,
  Expired: 2,
  Resolved: 3,
} as const;

export const Outcome = {
  Undecided: 0,
  Yes: 1,
  No: 2,
} as const;

export const marketStatusToString = (status: number): 'preparing' | 'active' | 'expired' | 'resolved' => {
  switch (status) {
    case MarketStatus.Preparing: return 'preparing';
    case MarketStatus.Active: return 'active';
    case MarketStatus.Expired: return 'expired';
    case MarketStatus.Resolved: return 'resolved';
    default: return 'preparing';
  }
};

export const outcomeToString = (outcome: number): 'yes' | 'no' | undefined => {
  switch (outcome) {
    case Outcome.Yes: return 'yes';
    case Outcome.No: return 'no';
    default: return undefined;
  }
};
