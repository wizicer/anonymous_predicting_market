// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

uint256 constant MAX_BETS = 10;

interface IBetVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[6] calldata publicSignals
    ) external view returns (bool);
}

interface IBatchOpenVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[3 + MAX_BETS * 2] calldata publicSignals
    ) external view returns (bool);
}

contract AnonymousPredictionMarket {
    uint256 public constant ORACLE_DELAY = 24 hours;

    IBetVerifier public betVerifier;
    IBatchOpenVerifier public batchOpenVerifier;

    enum MarketStatus { Preparing, Active, Expired, Resolved }
    enum Outcome { Undecided, Yes, No }

    struct CommitteeInfo {
        bytes32 keyShare;
    }

    struct EncryptedBet {
        address bettor;
        bytes32 commitment;
        bytes32 cypherText;
        uint256 amount;
        uint256 timestamp;
        bool verified;
    }

    struct Market {
        string question;
        string description;
        uint256 salt;

        MarketStatus status;
        uint256 expiresAt;

        uint8 requiredCommittee;
        uint8 requiredReputation;

        address[] committee;
        mapping(address => CommitteeInfo) committeeInfo;

        uint32 betCount;
        mapping(uint32 => EncryptedBet) betInfo;

        bytes32 publicKeyX;
        bytes32 publicKeyY;
        bytes32 publicKeyCommitment;

        Outcome outcome;
        uint256 oracleSubmittedAt;
    }

    Market[] public markets;

    /* ==================== Constructor ==================== */

    constructor(address _betVerifier, address _batchOpenVerifier) {
        betVerifier = IBetVerifier(_betVerifier);
        batchOpenVerifier = IBatchOpenVerifier(_batchOpenVerifier);
    }

    /* ==================== Market ==================== */

    function createMarket(
        string calldata question,
        string calldata description,
        uint256 salt,
        uint256 expiresAt,
        uint8 requiredCommittee,
        uint8 requiredReputation
    ) external {
        require(expiresAt > block.timestamp, "invalid expiry");

        Market storage m = markets.push();
        m.question = question;
        m.description = description;
        m.salt = salt;
        m.expiresAt = expiresAt;
        m.requiredCommittee = requiredCommittee;
        m.requiredReputation = requiredReputation;
        m.status = MarketStatus.Preparing;
        m.outcome = Outcome.Undecided;
    }

    function activateMarket(
        uint256 marketId,
        bytes32 pkX,
        bytes32 pkY,
        bytes32 pkCommitment
    ) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Preparing, "bad status");
        require(m.committee.length >= m.requiredCommittee, "committee not ready");

        m.publicKeyX = pkX;
        m.publicKeyY = pkY;
        m.publicKeyCommitment = pkCommitment;
        m.status = MarketStatus.Active;
    }

    function expireMarket(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Active, "bad status");
        require(block.timestamp >= m.expiresAt, "not expired");

        m.status = MarketStatus.Expired;
    }

    /* ==================== Committee ==================== */

    function joinCommittee(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Preparing, "bad status");

        CommitteeInfo storage info = m.committeeInfo[msg.sender];
        require(!info.joined, "already joined");

        info.joined = true;
        m.committee.push(msg.sender);
    }

    function submitKeyShare(uint256 marketId) external {
        Market storage m = markets[marketId];
        CommitteeInfo storage info = m.committeeInfo[msg.sender];

        require(info.joined, "not committee");
        require(!info.keyShareSubmitted, "already submitted");

        info.keyShareSubmitted = true;
    }

    /* ==================== Betting ==================== */

    function placeEncryptedBet(
        uint256 marketId,
        bytes32 commitment,
        bytes32 cypherText,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[6] calldata publicSignals
    ) external payable {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Active, "not active");
        require(m.betCount < MAX_BETS, "bet limit reached");
        require(msg.value > 0, "zero amount");

        bool ok = betVerifier.verifyProof(a, b, c, publicSignals);
        require(ok, "invalid bet proof");

        uint32 betId = m.betCount;

        m.betInfo[betId] = EncryptedBet({
            bettor: msg.sender,
            commitment: commitment,
            cypherText: cypherText,
            amount: msg.value,
            timestamp: block.timestamp,
            verified: true
        });

        m.betCount += 1;
    }

    /* ==================== Oracle ==================== */

    function submitOutcome(uint256 marketId, Outcome outcome) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Expired, "bad status");
        require(outcome != Outcome.Undecided, "invalid outcome");

        m.outcome = outcome;
        m.oracleSubmittedAt = block.timestamp;
    }

    /* ==================== Batch Open ==================== */

    function batchOpenAndResolve(
        uint256 marketId,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[3 + MAX_BETS * 2] calldata publicSignals
    ) external {
        Market storage m = markets[marketId];
        require(m.status == MarketStatus.Expired, "bad status");
        require(block.timestamp >= m.oracleSubmittedAt + ORACLE_DELAY, "oracle delay");

        bool ok = batchOpenVerifier.verifyProof(a, b, c, publicSignals);
        require(ok, "invalid batch open proof");

        m.status = MarketStatus.Resolved;
    }

    /* ==================== View ==================== */

    function marketCount() external view returns (uint256) {
        return markets.length;
    }

    function getCommittee(uint256 marketId) external view returns (address[] memory) {
        return markets[marketId].committee;
    }
}
