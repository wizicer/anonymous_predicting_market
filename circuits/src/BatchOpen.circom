pragma circom 2.1.0;

include "circomlib/poseidon.circom";

/*
ZK-BatchOpen Circuit Prototype

public inputs:
    comm[i]
    amount[i]
    salt
private inputs:
    side[i]
    address[i]

public outputs:
    sum0, sum1

statement:
1. forall i: comm[i] = Poseidon(side[i], salt, amount[i], address[i])
2. side[i] ∈ {0,1}
3. sum0 = Σ( (1 - side[i]) * amount[i] )
   sum1 = Σ( side[i] * amount[i] )
*/

template BatchOpen(N) {
    // Public Inputs
    signal input comm[N];
    signal input amount[N];
    signal input salt;

    // Private Inputs
    signal input side[N];
    signal input address[N];

    // Public Outputs
    signal output sum0;
    signal output sum1;

    signal sum0_accum <== 0;
    signal sum1_accum <== 0;

    // ============================================================
    // Loop over batch
    // ============================================================
    for (var i = 0; i < N; i++) {

        // 1. side[i] ∈ {0,1}
        signal s = side[i];
        0 === s * (s - 1);

        // 2. commitment check
        // comm[i] = Poseidon(side, salt, amount, address)
        component c = Poseidon(4);
        c.inputs[0] <== s;
        c.inputs[1] <== salt;
        c.inputs[2] <== amount[i];
        c.inputs[3] <== address[i];

        c.out === comm[i];

        // 3. accumulate sum0 and sum1
        // TODO: write correct code
        signal amount0;
        signal amount1;

        amount0 <== (1 - s) * amount[i];
        amount1 <== s * amount[i];

        sum0_accum <== sum0_accum + amount0;
        sum1_accum <== sum1_accum + amount1;
    }

    sum0 <== sum0_accum;
    sum1 <== sum1_accum;
}
