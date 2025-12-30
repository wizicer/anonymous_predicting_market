pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

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
    
    // temporary signals
    signal s[N];
    signal amount0[N];
    signal amount1[N];
    component c[N];
    signal sum0_accum[N + 1];
    signal sum1_accum[N + 1];
    sum0_accum[0] <== 0;
    sum1_accum[0] <== 0;

    // ============================================================
    // Loop over batch
    // ============================================================
    for (var i = 0; i < N; i++) {

        // 1. side[i] ∈ {0,1}
        s[i] <== side[i];
        0 === s[i] * (s[i] - 1);

        // 2. commitment check
        // comm[i] = Poseidon(side, salt, amount, address)
        c[i] = Poseidon(4);
        c[i].inputs[0] <== s[i];
        c[i].inputs[1] <== salt;
        c[i].inputs[2] <== amount[i];
        c[i].inputs[3] <== address[i];
        c[i].out === comm[i];

        // 3. accumulate sum0 and sum1
        amount0[i] <== (1 - s[i]) * amount[i];
        amount1[i] <== s[i] * amount[i];

        sum0_accum[i + 1] <== sum0_accum[i] + amount0[i];
        sum1_accum[i + 1] <== sum1_accum[i] + amount1[i];
    }

    sum0 <== sum0_accum[N];
    sum1 <== sum1_accum[N];
}
