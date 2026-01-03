export interface BatchOpenProof {
  sum0: bigint;
  sum1: bigint;
  a: [bigint, bigint];
  b: [[bigint, bigint], [bigint, bigint]];
  c: [bigint, bigint];
}

export async function getBatchOpenProof(
  N: bigint,
  comm: bigint[],
  amount: bigint[],
  salt: bigint,
  side: bigint[],
  address: bigint[]
): Promise<BatchOpenProof> {
  if (comm.length !== Number(N))
    throw new Error("Invalid comm length, required N elements");

  if (amount.length !== Number(N))
    throw new Error("Invalid amount length, required N elements");

  if (side.length !== Number(N))
    throw new Error("Invalid side length, required N elements");

  if (address.length !== Number(N))
    throw new Error("Invalid address length, required N elements");

  const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
    {
      comm,
      amount,
      salt,
      side,
      address,
    },

    "circuits/BatchOpen.wasm",
    "circuits/BatchOpen_final.zkey"
  );

  const ep = await window.snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );
  const eep = JSON.parse("[" + ep + "]");

  return {
    sum0: eep[3][0],
    sum1: eep[3][1],
    a: eep[0],
    b: eep[1],
    c: eep[2],
  };
}
