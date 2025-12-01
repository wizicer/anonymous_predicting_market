use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use ff::Field;
use group::{Group, GroupEncoding};
use jubjub::{Fr, SubgroupPoint};
use rand::{rng, RngCore};
use sha2::{Digest, Sha256};
use std::ops::Mul;

type Scalar = Fr;
type Point = SubgroupPoint;

// parameters
const N: usize = 5;
const T: usize = 3;

fn random_scalar() -> Scalar {
    let mut rng = rng();
    let mut buf = [0u8; 64];
    rng.fill_bytes(&mut buf);
    Scalar::from_bytes_wide(&buf)
}

fn eval_poly(coeffs: &[Scalar], x: Scalar) -> Scalar {
    let mut res = Scalar::zero();
    let mut power = Scalar::one();
    for c in coeffs {
        res += *c * power;
        power *= x;
    }
    res
}

fn lagrange_coeff(i: usize, subset: &[usize]) -> Scalar {
    let mut num = Scalar::one();
    let mut den = Scalar::one();
    let i_scalar = Scalar::from(i as u64);
    for &j in subset {
        if j == i {
            continue;
        }
        let j_scalar = Scalar::from(j as u64);
        num *= -j_scalar;
        den *= i_scalar - j_scalar;
    }
    num * den.invert().unwrap()
}

fn derive_symmetric_key(shared_point: &Point) -> [u8; 32] {
    let bytes = shared_point.to_bytes();
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let hash = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&hash);
    key
}

#[derive(Clone, Debug)]
struct Ciphertext {
    R: Point,
    ct: Vec<u8>,
    nonce: [u8; 12],
}

fn encrypt(pk: &Point, plaintext: &[u8]) -> Ciphertext {
    let r = random_scalar();
    let R = Point::generator() * r;
    let S = *pk * r;

    let key_bytes = derive_symmetric_key(&S);
    let aead = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key_bytes));

    let mut nonce = [0u8; 12];
    rng().fill_bytes(&mut nonce);
    let ct = aead
        .encrypt(Nonce::from_slice(&nonce), plaintext)
        .expect("encryption failure");

    Ciphertext { R, ct, nonce }
}

fn partial_decrypt_share(sk_i: &Scalar, ct: &Ciphertext) -> Point {
    ct.R * *sk_i
}

fn combine_shares(shares: &[(usize, Point)]) -> Point {
    let subset: Vec<usize> = shares.iter().map(|(i, _)| *i).collect();
    let mut S = Point::identity();
    for &(i, ref share_i) in shares {
        let lam = lagrange_coeff(i, &subset);
        S += *share_i * lam;
    }
    S
}

fn decrypt_with_S(S: &Point, ct: &Ciphertext) -> Vec<u8> {
    let key_bytes = derive_symmetric_key(S);
    let aead = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key_bytes));
    aead.decrypt(Nonce::from_slice(&ct.nonce), ct.ct.as_ref())
        .expect("decryption failure")
}

fn main() {
    // ===== DKG Phase =====
    let mut poly: Vec<Vec<Scalar>> = Vec::new();
    for _ in 0..N {
        let mut coeffs = Vec::new();
        for _ in 0..T {
            coeffs.push(random_scalar());
        }
        poly.push(coeffs);
    }

    // Each participant's shares
    let mut shares: Vec<Vec<Scalar>> = vec![vec![Scalar::zero(); N]; N];
    for j in 0..N {
        for i in 0..N {
            let x = Scalar::from((i + 1) as u64);
            shares[j][i] = eval_poly(&poly[j], x);
        }
    }

    // Final secret shares
    let mut sk_share: Vec<Scalar> = Vec::new();
    for i in 0..N {
        let mut s = Scalar::zero();
        for j in 0..N {
            s += shares[j][i];
        }
        sk_share.push(s);
    }

    // Global public key PK = sum_j [a_{j,0}]G
    let mut PK = Point::identity();
    for j in 0..N {
        let a0 = poly[j][0];
        PK += Point::generator() * a0;
    }
    println!("Global PK = {:?}", PK);

    // ===== Encryption =====
    let msg = b"Hello Threshold DKG + ECIES!";
    let ct = encrypt(&PK, msg);
    println!("Ciphertext len = {}", ct.ct.len());

    // ===== Partial decrypt (first T parties) =====
    let mut part: Vec<(usize, Point)> = Vec::new();
    for i in 0..T {
        let share_i = partial_decrypt_share(&sk_share[i], &ct);
        part.push((i + 1, share_i));
    }

    // ===== Combine shares & decrypt =====
    let S = combine_shares(&part);
    let decrypted = decrypt_with_S(&S, &ct);
    println!("Decrypted: {}", String::from_utf8_lossy(&decrypted));
}
