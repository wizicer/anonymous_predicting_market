// Taken from https://github.com/Shigoto-dev19/ec-elgamal-circom
import type { AffinePoint } from "@noble/curves/abstract/curve";
import { babyJub as CURVE } from "./utils/babyjub-noble";
import { prv2pub, bigInt2Buffer, formatPrivKeyForBabyJub } from "./utils/tools";
import type { ExtPointType } from "@noble/curves/abstract/edwards";
import { poseidonHashBet } from "./hash";

type SnarkBigInt = bigint;
type PrivKey = bigint;
type PubKey = ExtPointType;
type BabyJubAffinePoint = AffinePoint<bigint>;
type BabyJubExtPoint = ExtPointType;

/**
 * A private key and a public key
 */
interface Keypair {
    privKey: PrivKey;
    pubKey: PubKey;
}

// The BN254 group order p
const SNARK_FIELD_SIZE: SnarkBigInt = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);
// Textbook Elgamal Encryption Scheme over Baby Jubjub curve without message encoding
const babyJub = CURVE.ExtendedPoint;

/**
 * Returns a BabyJub-compatible random value. We create it by first generating
 * a random value (initially 256 bits large) modulo the snark field size as
 * described in EIP197. This results in a key size of roughly 253 bits and no
 * more than 254 bits. To prevent modulo bias, we then use this efficient
 * algorithm:
 * http://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/lib/libc/crypt/arc4random_uniform.c
 * @return A BabyJub-compatible random value.
 * @see {@link https://github.com/privacy-scaling-explorations/maci/blob/master/crypto/ts/index.ts}
 */
/**
 * Generate random bytes using Web Crypto API (browser-compatible)
 */
function getRandomBytes(length: number): Uint8Array {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return array;
    }
    // Fallback for Node.js environment
    if (typeof require !== 'undefined') {
        const crypto = require('crypto');
        return crypto.randomBytes(length);
    }
    throw new Error('No random number generator available');
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(array: Uint8Array): string {
    return Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function genRandomBabyJubValue(): bigint {
    // Prevent modulo bias
    //const lim = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
    //const min = (lim - SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
    const min = BigInt(
        "6350874878119819312338956282401532410528162663560392320966563075034087161851",
    );

    let rand;
    while (true) {
        const randomBytes = getRandomBytes(32);
        rand = BigInt("0x" + uint8ArrayToHex(randomBytes));

        if (rand >= min) {
            break;
        }
    }

    const privKey: PrivKey = rand % SNARK_FIELD_SIZE;
    if (privKey >= SNARK_FIELD_SIZE) {
        throw new Error("Invalid private key generated");
    }

    return privKey;
}

/**
 * @return A BabyJub-compatible private key.
 */
const genPrivKey = (): PrivKey => {
    return genRandomBabyJubValue();
};

/**
 * @return A BabyJub-compatible salt.
 */
const genRandomSalt = (): PrivKey => {
    return genRandomBabyJubValue();
};

/**
 * @param privKey A private key generated using genPrivKey()
 * @return A public key associated with the private key
 */
function genPubKey(privKey: PrivKey): PubKey {
    // Check whether privKey is a field element
    privKey = BigInt(privKey.toString());
    if (privKey >= SNARK_FIELD_SIZE) {
        throw new Error("Invalid private key: exceeds field size");
    }
    return prv2pub(bigInt2Buffer(privKey));
}

function genKeypair(): Keypair {
    const privKey = genPrivKey();
    const pubKey = genPubKey(privKey);

    const Keypair: Keypair = { privKey, pubKey };

    return Keypair;
}

function genRandomPoint(): BabyJubExtPoint {
    const salt = genRandomBabyJubValue();
    return genPubKey(salt);
}

/**
 * @return A BabyJub-compatible salt.
 */
function genRandomEncodeSidePoint(side: number): BabyJubExtPoint {
    // 检查 side 是否为 0 或 1
    if (side !== 0 && side !== 1) {
        throw new Error("side 只能是 0 或 1");
    }
    let encoded_side_point: BabyJubExtPoint;
    while (true) {
        const random_original_message = genRandomBabyJubValue();
        const encoded_side = babyJub.BASE.multiply(random_original_message);
        const encoded_side_point_affine = encoded_side.toAffine();
        if (encoded_side_point_affine.x % 2n === BigInt(side)) {
            encoded_side_point = encoded_side;
            break;
        }
    }
    return encoded_side_point;
};

/**
 * Encrypts a plaintext such that only the owner of the specified public key
 * may decrypt it.
 * @param pubKey The recepient's public key
 * @param encodedMessage A plaintext encoded as a BabyJub curve point (optional)
 * @param randomVal A random value y used along with the private key to generate the ciphertext (optional)
 */
function encrypt(pubKey: PubKey, encodedMessage?: BabyJubExtPoint, randomVal?: bigint) {
    const message = encodedMessage ?? genRandomPoint();

    // The sender chooses a secret key as a nonce
    // If randomVal is provided, it needs to be formatted for BabyJub compatibility
    // to match the format used in decrypt (formatPrivKeyForBabyJub)
    const nonce: bigint = randomVal ?? formatPrivKeyForBabyJub(genRandomSalt());

    // The sender calculates an ephemeral key => [nonce].Base
    const ephemeral_key = babyJub.BASE.multiply(nonce);
    const masking_key = pubKey.multiply(nonce);
    let encrypted_message: BabyJubExtPoint;
    // The sender encrypts the encodedMessage
    try {
        if (pubKey.assertValidity) {
            pubKey.assertValidity();
        }
        if (pubKey.equals(babyJub.ZERO)) {
            throw new Error("Invalid Public Key!");
        }
        encrypted_message = message.add(masking_key);
    } catch {
        throw new Error("Invalid Public Key!");
    }

    return { message, ephemeral_key, encrypted_message, nonce };
}

/**
 * Encrypts a plaintext such that only the owner of the specified public key
 * may decrypt it.
 * @param pubKey The recepient's public key
 * @param encodedMessage A plaintext encoded as a BabyJub curve point (optional)
 * @param randomVal A random value y used along with the private key to generate the ciphertext (optional)
 */
function encrypt_circom(pubKey: PubKey, encodedMessage: BabyJubExtPoint, randomVal: bigint) {
    const message = encodedMessage ?? genRandomPoint();

    // The sender chooses a secret key as a nonce
    const nonce: bigint = randomVal;

    // The sender calculates an ephemeral key => [nonce].Base
    const ephemeral_key = babyJub.BASE.multiply(nonce);
    const masking_key = pubKey.multiply(nonce);
    let encrypted_message: BabyJubExtPoint;
    // The sender encrypts the encodedMessage
    try {
        if (pubKey.assertValidity) {
            pubKey.assertValidity();
        }
        if (pubKey.equals(babyJub.ZERO)) {
            throw new Error("Invalid Public Key!");
        }
        encrypted_message = message.add(masking_key);
    } catch {
        throw new Error("Invalid Public Key!");
    }

    return { message, ephemeral_key, encrypted_message, nonce };
}

/**
 * Decrypts a ciphertext using a private key.
 * @param privKey The private key
 * @param ciphertext The ciphertext to decrypt
 */
function decrypt(
    privKey: PrivKey,
    ephemeral_key: BabyJubExtPoint,
    encrypted_message: BabyJubExtPoint,
): BabyJubExtPoint {
    // The receiver decrypts the message => encryptedMessage - [privKey].ephemeralKey
    const masking_key = ephemeral_key.multiply(formatPrivKeyForBabyJub(privKey));
    const decrypted_message = encrypted_message.add(masking_key.negate());

    return decrypted_message;
}

/**
 * Decrypts a ciphertext using a private key.
 * @param privKey The private key
 * @param ciphertext The ciphertext to decrypt
 */
function decrypt_circom(
    privateKey: PrivKey,
    ephemeral_key: BabyJubExtPoint,
    encrypted_message: BabyJubExtPoint,
): BabyJubExtPoint {    
    // The receiver decrypts the message => encryptedMessage - [privKey].ephemeralKey
    const masking_key = ephemeral_key.multiply(privateKey);
    const decrypted_message = encrypted_message.add(masking_key.negate());

    return decrypted_message;
}

// ElGamal Scheme with specified inputs for testing purposes
function encrypt_s(message: BabyJubExtPoint, public_key: PubKey, nonce?: bigint) {
    nonce = nonce ?? genRandomSalt();

    const ephemeral_key = babyJub.BASE.multiply(nonce);
    const masking_key = public_key.multiply(nonce);
    const encrypted_message = masking_key.add(message);

    return { ephemeral_key, encrypted_message };
}
/**
 * Randomize a ciphertext such that it is different from the original
 * ciphertext but can be decrypted by the same private key.
 * @param pubKey The same public key used to encrypt the original encodedMessage
 * @param ciphertext The ciphertext to re-randomize.
 * @param randomVal A random value z such that the re-randomized ciphertext could have been generated a random value y+z in the first
 *                  place (optional)
 */
function rerandomize(
    pubKey: PubKey,
    ephemeral_key: BabyJubExtPoint,
    encrypted_message: BabyJubExtPoint,
    randomVal?: bigint,
) {
    const nonce = randomVal ?? genRandomSalt();
    const randomized_ephemeralKey = ephemeral_key.add(babyJub.BASE.multiply(nonce));

    const randomized_encryptedMessage = encrypted_message.add(pubKey.multiply(nonce));

    return { randomized_ephemeralKey, randomized_encryptedMessage };
}

/**
 * @return A BabyJub-compatible salt.
 */
async function genCircomInputsForBet(side: number, salt: string, amount: number, address: string): Promise<{ encoded_side_point_x: string, encoded_side_point_y: string, nonce: bigint, comm: bigint }> {
    // 检查 side 是否为 0 或 1
    if (side !== 0 && side !== 1) {
        throw new Error("side 只能是 0 或 1");
    }
    const encoded_side_point = genRandomEncodeSidePoint(side);
    // encoded_side_point 是 AffinePoint，需要转换为 ExtPoint 才能传递给 poseidonHashBet
    const encoded_side_point_ext = babyJub.fromAffine({ x: encoded_side_point.x, y: encoded_side_point.y });
    let encoded_side_point_x = encoded_side_point.x.toString();
    let encoded_side_point_y = encoded_side_point.y.toString();
    const nonce = formatPrivKeyForBabyJub(genRandomSalt());
    const comm = await poseidonHashBet(encoded_side_point_ext, side, salt, amount, address);
    return { encoded_side_point_x, encoded_side_point_y, nonce, comm};
};

/**
 * @return A BabyJub-compatible salt.
 */
function decryptFromCircom(encrypted_message: BabyJubExtPoint, ephemeral_key: BabyJubExtPoint, sk: bigint): BabyJubAffinePoint {
    const privateKey = sk;
    const decrypted_message = decrypt_circom(privateKey, ephemeral_key, encrypted_message);
    const decrypted_message_affine = decrypted_message.toAffine();
    return decrypted_message_affine;
};


export {
    genRandomBabyJubValue,
    genRandomPoint,
    genRandomSalt,
    genPrivKey,
    genPubKey,
    genKeypair,
    encrypt,
    encrypt_s,
    decrypt,
    rerandomize,
    babyJub,
    decrypt_circom,
    encrypt_circom,
    genRandomEncodeSidePoint,
    genCircomInputsForBet,
    decryptFromCircom
};
export type {
    BabyJubAffinePoint,
    BabyJubExtPoint,
    Keypair
};
export { poseidonHashBet, initPoseidon } from "./hash";
