// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

uint256 constant MAX_BETS = 10;

// Mock verifier that always returns true for local development
contract MockBetVerifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[6] calldata
    ) external pure returns (bool) {
        return true;
    }
}

contract MockBatchOpenVerifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[3 + MAX_BETS * 2] calldata
    ) external pure returns (bool) {
        return true;
    }
}
