pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";

/*
ZK-BatchOpen Circuit Prototype

public inputs:
    comm[i]
    amount[i]
    salt
private inputs:
    side[i]
    encodedSidePoint[i][0]
    encodedSidePoint[i][1]
    address[i]

public outputs:
    sum0, sum1

statement:
1. for all valid i: comm[i] = Poseidon(encodedSidePoint[i][0] || encodedSidePoint[i][1] || side[i] || salt || amount[i] || address[i])
2. for all valid i: side[i] ∈ {0,1}
3. sum0 = Σ( (1 - side[i]) * amount[i] )
4. sum1 = Σ( side[i] * amount[i] )
*/

template BatchOpen(N) {
    // Public Inputs
    signal input salt;
    signal input comm[N];
    signal input amount[N];
    
    // Private Inputs
    signal input side[N];
    signal input address[N];
    signal input encodedSidePoint[N][2];

    // Public Outputs
    signal output sum0;
    signal output sum1;
    
    // temporary signals
    signal s[N];
    signal amount0[N];
    signal amount1[N];
    signal selector[N];
    component c[N];
    component isZero[N];
    signal sum0_accum[N + 1];
    signal sum1_accum[N + 1];
    sum0_accum[0] <== 0;
    sum1_accum[0] <== 0;

    // if comm[i] != 0, then selector[i] == 1 else selector[i] == 0
    for (var i = 0; i < N; i++) {
        isZero[i] = IsZero();
        isZero[i].in <== comm[i];
        selector[i] <== 1 - isZero[i].out;
    }

    // if selector[i] == 1, then valid_side[i] == side[i] else valid_side[i] == 0
    signal valid_side[N];
    for (var i = 0; i < N; i++) {
        valid_side[i] <== selector[i] * side[i];
    }

    signal valid_amount[N];
    for (var i = 0; i < N; i++) {
        valid_amount[i] <== selector[i] * amount[i];
    }

    // ============================================================
    // Loop over batch
    // ============================================================
    for (var i = 0; i < N; i++) {

        // 1. side[i] ∈ {0,1}
        s[i] <== valid_side[i];
        0 === s[i] * (s[i] - 1);

        // 2. commitment check
        // comm[i] = Poseidon(encodedSidePoint[i][0] || encodedSidePoint[i][1]
        //                    || side[i] || salt || amount[i] || address[i])
        c[i] = Poseidon(6);
        c[i].inputs[0] <== encodedSidePoint[i][0];
        c[i].inputs[1] <== encodedSidePoint[i][1];
        c[i].inputs[2] <== side[i];
        c[i].inputs[3] <== salt;
        c[i].inputs[4] <== amount[i];
        c[i].inputs[5] <== address[i];
        // if selector[i] == 1, then c[i].out == comm[i]
        // if selector[i] == 0, then pass the constraint
        0 === selector[i] * (c[i].out - comm[i]);

        // 3. accumulate sum0 and sum1
        amount0[i] <== (1 - s[i]) * valid_amount[i];
        amount1[i] <== s[i] * valid_amount[i];

        sum0_accum[i + 1] <== sum0_accum[i] + amount0[i];
        sum1_accum[i + 1] <== sum1_accum[i] + amount1[i];
    }

    sum0 <== sum0_accum[N];
    sum1 <== sum1_accum[N];
}
