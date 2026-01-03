pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "encrypt.circom";

/*
ZK-Bet Circuit Prototype
public: PK, comm, amount, address, salt
private: side
output: ct  (ciphertext placeholder)
*/

template Bet() {
    // --------------------------
    // Public Inputs
    // --------------------------
    signal input PK[2];             // public key
    signal input comm;              // on-chain commitment
    signal input amount;            // bet amount
    signal input address;           // user address, for example 160 bits
    signal input salt;              // global salt
    
    // --------------------------
    // Private Inputs
    // --------------------------
    signal input side;         // 0 or 1, hidden from chain
    signal input nonceKey;     // nonce for encryption
    signal input encodedSidePoint[2]; // encoded side point

    // --------------------------
    // Public Outputs
    // --------------------------
    signal output encryptedMessage[2];       // encrypted output (placeholder)
    signal output ephemeralKey[2];           // ephemeral key

    // ============================================================
    // 1. side ∈ {0,1}
    // ============================================================
    0 === side * (side - 1);

    // ============================================================
    // 2. "Encryption" :
    //    ct := Enc(PK, side || address)
    //    Using ElGamal Encryption Gadget
    // ============================================================

    component encrypt = Encrypt();
    encrypt.message <== encodedSidePoint;
    encrypt.nonceKey <== nonceKey;
    encrypt.publicKey <== PK;
    encryptedMessage <== encrypt.encryptedMessage;
    ephemeralKey <== encrypt.ephemeralKey;
    log("encryptedMessage:", encryptedMessage[0], encryptedMessage[1]);
    log("ephemeralKey:", ephemeralKey[0], ephemeralKey[1]);

    // ============================================================
    // 3. Commitment check:
    //    comm == Poseidon(encodedSidePoint[0] || encodedSidePoint[1]
    //                     || side || salt || amount || address)
    // ============================================================
    component commHash = Poseidon(6);
    commHash.inputs[0] <== encodedSidePoint[0];
    commHash.inputs[1] <== encodedSidePoint[1];
    commHash.inputs[2] <== side;
    commHash.inputs[3] <== salt;
    commHash.inputs[4] <== amount;
    commHash.inputs[5] <== address;
    log("commHash.out:", commHash.out);
    log("comm:", comm);
    commHash.out === comm;

    // ============================================================
    // 4. Check: amount > 0
    // ============================================================
    component isZero = IsZero();
    isZero.in <== amount;
    isZero.out === 0;   // assert amount > 0
}