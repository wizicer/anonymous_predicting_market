pragma circom 2.1.0;

include "BatchOpen.circom";

component main { public [comm, amount, salt] } = BatchOpen(3);   // example N = 3
