pragma circom 2.1.0;

include "circomlib/poseidon.circom";

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
    signal input PK;        // simplified: normally PK is a struct; here hash placeholder
    signal input comm;      // on-chain commitment
    signal input amount;    // bet amount
    signal input address;   // user address
    signal input salt;      // global salt

    // --------------------------
    // Private Inputs
    // --------------------------
    signal input side;      // 0 or 1, hidden from chain

    // --------------------------
    // Public Outputs
    // --------------------------
    signal output ct;       // encrypted output (placeholder)

    // ============================================================
    // 1. side ∈ {0,1}
    // ============================================================
    0 === side * (side - 1);

    // ============================================================
    // 2. "Encryption" placeholder:
    //    ct = Hash(PK || side || address)
    //    Replace with real ElGamal/ECIES gadget later.
    // ============================================================
    component encHash = Poseidon(3);
    encHash.inputs[0] <== PK;
    encHash.inputs[1] <== side;
    encHash.inputs[2] <== address;
    ct <== encHash.out;

    // ============================================================
    // 3. Commitment check:
    //    comm = Poseidon(salt || side || amount || address)
    // ============================================================
    component commHash = Poseidon(4);
    commHash.inputs[0] <== salt;
    commHash.inputs[1] <== side;
    commHash.inputs[2] <== amount;
    commHash.inputs[3] <== address;

    commHash.out === comm;

    // ============================================================
    // 4. Range check for amount: assume amount < 2^32 (example)
    //    Replace with reasonable constraints.
    // ============================================================
    // amount fits in 32 bits
    // TODO: write correct code
    var RANGE = 32;
    signal bit;
    signal temp = amount;
    for (var i = 0; i < RANGE; i++) {
        bit <-- temp % 2;
        // no constraints, placeholder; if want strict range use Num2Bits
        temp = (temp - bit) / 2;
    }
}