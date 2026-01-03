import { decode, encode, split64 } from "../utils/decode";
import { assert, expect } from "chai";
import {
    babyJub,
    genRandomPoint,
    genKeypair,
    genRandomSalt,
    encrypt,
    encrypt_s,
    decrypt,
    rerandomize,
    BabyJubExtPoint,
    decrypt_circom,
    encrypt_circom,
    genRandomEncodeSidePoint
} from "../src";

import { pruneTo32Bits, pruneTo64Bits, coordinatesToExtPoint, formatPrivKeyForBabyJub } from "../utils/tools";

const b32 = 4294967296n;

describe("Testing ElGamal Scheme on EC points directly", () => {
    it("Check compliance of orignal and decrypted message as points", () => {
        const encoded_side = genRandomEncodeSidePoint(0);
        console.log("encoded_side:", encoded_side.x.toString(), encoded_side.y.toString());
    });

    it("Check compliance of orignal and decrypted message as points", () => {
        console.log("=============== set up ===============");
        const manualPubKeyX = "12491931337615216906644451308100368990772328332823118861435481277128519010406";
        const manualPubKeyY = "4085398734649953375506534926466287042440660224509217955443595497259710547300";
        const manualPrivKey = BigInt("661646617256359294681698252373527273604220614134283138546703562219259151382");
        
        let privKey: bigint;
        let publicKey: BabyJubExtPoint;

        privKey = manualPrivKey;
        publicKey = coordinatesToExtPoint(manualPubKeyX, manualPubKeyY);
        console.log("privKey:", privKey.toString());
        console.log("publicKey:", publicKey.toAffine().x.toString(), publicKey.toAffine().y.toString());
        
        console.log("=============== encrypt message ===============");
        const manualOriginMessageX = "10029440200522091702473469290628307505228897845647372427209999716838760796322";
        const manualOriginMessageY = "7242307979005772508776027026076601648052505420286032683150311831754469636198";

        const manualNonceKey = BigInt("1111231111111");


        let originMessage: BabyJubExtPoint;
        originMessage = coordinatesToExtPoint(manualOriginMessageX, manualOriginMessageY);
        let nonceKey: bigint;
        nonceKey = manualNonceKey;

        console.log("originMessage:", originMessage.toAffine().x.toString(), originMessage.toAffine().y.toString());
        console.log("nonceKey:", nonceKey.toString());
        
        const ts_encrypt_message = encrypt_circom(publicKey, originMessage, nonceKey);
        console.log("ts_original_message:", ts_encrypt_message.message.toAffine().x.toString(), ts_encrypt_message.message.toAffine().y.toString());
        console.log("ts_encrypt_message:", ts_encrypt_message.encrypted_message.toAffine().x.toString(), ts_encrypt_message.encrypted_message.toAffine().y.toString());
        console.log("ts_ephemeral_key:", ts_encrypt_message.ephemeral_key.toAffine().x.toString(), ts_encrypt_message.ephemeral_key.toAffine().y.toString());
        console.log("ts_nonce:", ts_encrypt_message.nonce.toString());

        console.log("=============== decrypt ts message ===============");
        const ts_decrypted_message = decrypt(
            privKey,
            ts_encrypt_message.ephemeral_key,
            ts_encrypt_message.encrypted_message,
        );
        console.log("ts_decrypted_message:", ts_decrypted_message.toAffine().x.toString(), ts_decrypted_message.toAffine().y.toString());

        console.log("=============== decrypt circom message ===============");
        const manualEphemeralKeyX = "16893826741750716032886421133531849095623326210162445279329191928962142967832";
        const manualEphemeralKeyY = "1992123035709634870795410730765657843214397641798807965550112772105074553428";
        const manualCircomEncryptedMessageX = "14120213164027111466688593542889673594068800221977257068813897491699900219188";
        const manualCircomEncryptedMessageY = "9052673922196671521632526075871904139347814737189450701010950501610315365696";
        
        let ephemeralKey: BabyJubExtPoint;
        ephemeralKey = coordinatesToExtPoint(manualEphemeralKeyX, manualEphemeralKeyY);
        let circom_encrypted_message: BabyJubExtPoint;
        circom_encrypted_message = coordinatesToExtPoint(manualCircomEncryptedMessageX, manualCircomEncryptedMessageY);
        console.log("circom_encrypted_message:", circom_encrypted_message.toAffine().x.toString(), circom_encrypted_message.toAffine().y.toString());
        console.log("circom_ephemeral_key:", ephemeralKey.toAffine().x.toString(), ephemeralKey.toAffine().y.toString());
        console.log("circom_privKey:", privKey.toString());
        
        const circom_decrypted_message = decrypt_circom(
            privKey,
            ephemeralKey,
            circom_encrypted_message,
        );
        console.log("circom_decrypted_message:", circom_decrypted_message.toAffine().x.toString(), circom_decrypted_message.toAffine().y.toString());

        console.log("=============== compare ts encrypted message  ===============");
        // 比较 ts_decrypted_message 是否和 original message 是否相等

        const ts_dec_affine = ts_decrypted_message.toAffine();
        const origin_affine = originMessage.toAffine();
        console.log("ts_dec_affine:", ts_dec_affine.x.toString(), ts_dec_affine.y.toString());
        console.log("origin_affine:", origin_affine.x.toString(), origin_affine.y.toString());

        console.log("=============== compare circom encrypted message  ===============");
        // 比较 circom_decrypted_message 是否和 original message 是否相等
        const circom_dec_affine = circom_decrypted_message.toAffine();
        console.log("circom_dec_affine:", circom_dec_affine.x.toString(), circom_dec_affine.y.toString());
        console.log("origin_affine:", origin_affine.x.toString(), origin_affine.y.toString());
    });
});