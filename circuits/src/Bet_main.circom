pragma circom 2.1.0;

include "Bet.circom";

component main { public [PK, comm, amount, address, salt] } = Bet();
