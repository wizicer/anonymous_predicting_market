/**
 * Pedersen Distributed Key Generation (DKG) Protocol
 * Based on Baby Jubjub curve for threshold cryptography
 */

import { Base8, addPoint, mulPointEscalar } from '@zk-kit/baby-jubjub';

// Baby Jubjub subgroup order r
export const SUBGROUP_ORDER = BigInt(
  "2736030358979909402780800718157159386076813972158567259200215660948447373041"
);

// Point type for Baby Jubjub curve
export type Point = [bigint, bigint];

// Identity point (neutral element)
export const IDENTITY: Point = [0n, 1n];

// Base point (generator) from @zk-kit/baby-jubjub
const BASE8: Point = Base8 as Point;

/**
 * Modular arithmetic: (a mod m), always positive
 */
export function mod(a: bigint, m: bigint = SUBGROUP_ORDER): bigint {
  return ((a % m) + m) % m;
}

/**
 * Generate a random scalar in the Baby Jubjub subgroup
 */
export function randScalar(): bigint {
  const arr = crypto.getRandomValues(new Uint8Array(32));
  let x = 0n;
  for (let i = 0; i < 32; i++) {
    x = (x << 8n) + BigInt(arr[i]);
  }
  return mod(x);
}

/**
 * Evaluate polynomial at point x
 * coeffs[0] + coeffs[1]*x + coeffs[2]*x^2 + ...
 */
export function evalPoly(coeffs: bigint[], x: number): bigint {
  let res = 0n;
  let pow = 1n;
  for (const c of coeffs) {
    res = mod(res + c * pow);
    pow = mod(pow * BigInt(x));
  }
  return res;
}

/**
 * Multiply base point by scalar: g^s
 */
export function mul(s: bigint): Point {
  return mulPointEscalar(BASE8, s) as Point;
}

/**
 * Add two points on the curve
 */
export function addPoints(p1: Point, p2: Point): Point {
  return addPoint(p1, p2) as Point;
}

/**
 * Multiply a point by a scalar
 */
export function mulPoint(p: Point, s: bigint): Point {
  return mulPointEscalar(p, s) as Point;
}

/**
 * Verify a share using Feldman/Pedersen commitments
 * Checks: g^share == Π(C_k^(index^k))
 */
export function verifyShare(share: bigint, commitments: Point[], index: number): boolean {
  let rhs: Point = [...IDENTITY];
  let pow = 1n;
  for (const C of commitments) {
    const Ci = mulPointEscalar(C, pow) as Point;
    rhs = addPoint(rhs, Ci) as Point;
    pow = mod(pow * BigInt(index));
  }
  const lhs = mulPointEscalar(BASE8, share) as Point;
  return lhs[0] === rhs[0] && lhs[1] === rhs[1];
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
export function modInv(a: bigint, m: bigint = SUBGROUP_ORDER): bigint {
  let lm = 1n;
  let hm = 0n;
  let low = mod(a, m);
  let high = m;
  while (low > 1n) {
    const ratio = high / low;
    [lm, hm] = [hm - lm * ratio, lm];
    [low, high] = [high - low * ratio, low];
  }
  return mod(lm, m);
}

/**
 * Compute Lagrange coefficient for index i given subset S
 * λ_i = Π_{j∈S, j≠i} (-j / (i - j))
 */
export function lagrangeCoeff(i: number, S: number[]): bigint {
  let num = 1n;
  let den = 1n;
  for (const j of S) {
    if (j !== i) {
      num = mod(num * BigInt(-j));
      den = mod(den * BigInt(i - j));
    }
  }
  return mod(num * modInv(den));
}

/**
 * Reconstruct secret from shares using Lagrange interpolation
 * shares: array of [index, share] pairs
 */
export function reconstructSecret(shares: Array<{ index: number; share: bigint }>): bigint {
  const indices = shares.map(s => s.index);
  let secret = 0n;
  for (const { index, share } of shares) {
    const lambda = lagrangeCoeff(index, indices);
    secret = mod(secret + share * lambda);
  }
  return secret;
}

// ==================== DKG Protocol Types ====================

export interface DkgPolynomial {
  coefficients: bigint[];
  commitments: Point[];
}

export interface DkgShare {
  fromIndex: number;
  toIndex: number;
  share: bigint;
}

export interface DkgParticipant {
  index: number;
  polynomial: DkgPolynomial;
  receivedShares: Map<number, bigint>;
  finalShare: bigint | null;
}

export interface DkgResult {
  publicKey: Point;
  secretShare: bigint;
  allCommitments: Point[][];
}

// ==================== DKG Protocol Functions ====================

/**
 * Generate a random polynomial of degree (threshold - 1)
 * The constant term (coeffs[0]) is the participant's secret contribution
 */
export function generatePolynomial(threshold: number): DkgPolynomial {
  const coefficients = Array.from({ length: threshold }, () => randScalar());
  const commitments = coefficients.map(c => mul(c));
  return { coefficients, commitments };
}

/**
 * Compute share for a specific participant index
 * share_ij = f_i(j) where f_i is sender's polynomial
 */
export function computeShare(polynomial: DkgPolynomial, targetIndex: number): bigint {
  return evalPoly(polynomial.coefficients, targetIndex);
}

/**
 * Compute all shares from one participant to all others
 */
export function computeAllShares(polynomial: DkgPolynomial, participantCount: number): DkgShare[] {
  const shares: DkgShare[] = [];
  for (let j = 1; j <= participantCount; j++) {
    shares.push({
      fromIndex: 0, // Will be set by caller
      toIndex: j,
      share: evalPoly(polynomial.coefficients, j),
    });
  }
  return shares;
}

/**
 * Verify a received share against the sender's commitments
 */
export function verifyReceivedShare(
  share: bigint,
  senderCommitments: Point[],
  receiverIndex: number
): boolean {
  return verifyShare(share, senderCommitments, receiverIndex);
}

/**
 * Compute final share by summing all received shares
 */
export function computeFinalShare(receivedShares: bigint[]): bigint {
  return receivedShares.reduce((sum, share) => mod(sum + share), 0n);
}

/**
 * Compute group public key from all participants' commitments
 * pk = Σ_i C_i[0] = Σ_i g^{a_i0}
 */
export function computeGroupPublicKey(allCommitments: Point[][]): Point {
  let pk: Point = [...IDENTITY];
  for (const commitments of allCommitments) {
    pk = addPoint(pk, commitments[0]) as Point;
  }
  return pk;
}

/**
 * Verify that reconstructed secret matches the public key
 */
export function verifyReconstruction(secret: bigint, publicKey: Point): boolean {
  const pk2 = mul(secret);
  return pk2[0] === publicKey[0] && pk2[1] === publicKey[1];
}

// ==================== Local Storage for Ephemeral Keys ====================

const EPHEMERAL_KEY_PREFIX = 'dkg_ephemeral_key_';

/**
 * Store ephemeral private key for a market
 */
export function storeEphemeralKey(marketId: string, secretShare: bigint): void {
  localStorage.setItem(`${EPHEMERAL_KEY_PREFIX}${marketId}`, secretShare.toString());
}

/**
 * Retrieve ephemeral private key for a market
 */
export function getEphemeralKey(marketId: string): bigint | null {
  const stored = localStorage.getItem(`${EPHEMERAL_KEY_PREFIX}${marketId}`);
  return stored ? BigInt(stored) : null;
}

/**
 * Remove ephemeral private key for a market
 */
export function removeEphemeralKey(marketId: string): void {
  localStorage.removeItem(`${EPHEMERAL_KEY_PREFIX}${marketId}`);
}

/**
 * Check if ephemeral key exists for a market
 */
export function hasEphemeralKey(marketId: string): boolean {
  return localStorage.getItem(`${EPHEMERAL_KEY_PREFIX}${marketId}`) !== null;
}
