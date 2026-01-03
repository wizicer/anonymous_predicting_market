// @ts-expect-error - snarkjs doesn't have type definitions
import * as snarkjs from "snarkjs";

export interface BetProof {
  encryptedMessage: [bigint, bigint];
  ephemeralKey: [bigint, bigint];
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
}

export async function getBetProof(
  PK: [bigint, bigint],
  comm: bigint,
  amount: bigint,
  address: bigint,
  salt: bigint,
  side: bigint,
  nonceKey: bigint,
  encodedSidePoint: [bigint, bigint]
): Promise<BetProof> {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      PK,
      comm,
      amount,
      address,
      salt,
      side,
      nonceKey,
      encodedSidePoint,
    },

    "/test/circuits_generator/Bet.wasm",
    "/test/circuits_generator/Bet_final.zkey"
  );

  const ep = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const eep = JSON.parse("[" + ep + "]");

  return {
    encryptedMessage: [eep[3][0], eep[3][1]],
    ephemeralKey: [eep[3][2], eep[3][3]],
    a: eep[0],
    b: eep[1],
    c: eep[2],
  };
}
