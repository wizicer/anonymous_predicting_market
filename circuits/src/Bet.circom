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
    signal input PK[2];     // public key
    signal input comm;      // on-chain commitment
    signal input amount;    // bet amount
    signal input address;   // user address, for example 160 bits
    signal input salt;      // global salt

    // --------------------------
    // Private Inputs
    // --------------------------
    signal input side;         // 0 or 1, hidden from chain
    signal input nonceKey;     // nonce for encryption

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
    // Verify address is 160 bits
    component addrBits = Num2Bits(160);
    addrBits.in <== address;

    // Encode side || address: side (1 bit) || address (160 bits) = 161 bits
    // side * (1 << 160) + address encodes side in the MSB and address in the lower 160 bits
    signal message[2];
    component encode = Encode161();
    encode.plaintext <== side * (1 << 160) + address;
    message[0] <== encode.out[0];
    message[1] <== encode.out[1];

    component encrypt = Encrypt();
    encrypt.message <== message;
    encrypt.nonceKey <== nonceKey;
    encrypt.publicKey <== PK;
    encryptedMessage <== encrypt.encryptedMessage;
    ephemeralKey <== encrypt.ephemeralKey;

    // ============================================================
    // 3. Commitment check:
    //    comm == Poseidon(side || salt || amount || address)
    // ============================================================
    component commHash = Poseidon(4);
    commHash.inputs[0] <== side;
    commHash.inputs[1] <== salt;
    commHash.inputs[2] <== amount;
    commHash.inputs[3] <== address;
    commHash.out === comm;

    // ============================================================
    // 4. Check: amount > 0
    // ============================================================
    component isZero = IsZero();
    isZero.in <== amount;
    isZero.out === 0;   // assert amount > 0
}