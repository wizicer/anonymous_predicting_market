pragma circom 2.1.0;

include "BatchOpen.circom";

component main { public [comm, amount, salt], private [side, address], output [sum0, sum1] } = BatchOpen(32);   // example N = 32
