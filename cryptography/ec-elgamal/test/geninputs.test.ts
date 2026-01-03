import { expect } from "chai";
import { babyJub, BabyJubExtPoint, decrypt, decrypt_circom, decryptFromCircom, encrypt_circom, genCircomInputsForBet, initPoseidon } from "../src";
import { coordinatesToExtPoint } from "../utils/tools";

describe("Testing genCircomInputsForBet function", () => {
    // 在所有测试之前初始化 Poseidon
    before(async () => {
        await initPoseidon();
    });

    it("Generate inputs for Bet circuit with manual values", () => {
        // 手动输入测试值
        const side = 1;
        const salt = "974334424887268612135789888477522013103955028650";
        const amount = 878;
        const address = "1091767867375995473349368877325274214414350531000";
        
        console.log("输入参数:");
        console.log("side:", side);
        console.log("salt:", salt);
        console.log("amount:", amount);
        console.log("address:", address);
        
        // 调用同步函数
        const inputs = genCircomInputsForBet(side, salt, amount, address);
        
        console.log("=============== 生成的输入 ===============");
        console.log("encoded_side_point_x:", inputs.encoded_side_point_x);
        console.log("encoded_side_point_y:", inputs.encoded_side_point_y);
        console.log("nonce:", inputs.nonce.toString());
        console.log("comm:", inputs.comm.toString());
        
        // 验证返回值的类型和格式
        expect(inputs, "inputs should be an object").to.be.an("object");
        expect(inputs.encoded_side_point_x, "encoded_side_point_x should be a string").to.be.a("string");
        expect(inputs.encoded_side_point_y, "encoded_side_point_y should be a string").to.be.a("string");
        expect(inputs.nonce, "nonce should be a bigint").to.be.a("bigint");
        expect(inputs.comm, "comm should be a bigint").to.be.a("bigint");
        
        // 验证 comm 是有效的 bigint（大于 0）
        expect(inputs.comm > 0n, "comm should be positive").to.be.true;
    });

    it("Test decryptFromCircom function with manual values", () => {
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
        const manualOriginMessageX = "7896327849009482194438794886913947848777288159566781403054007648208837602803";
        const manualOriginMessageY = "8690882803530804800789914142010760662204974407474804613699409658684860296321";
        const manualNonceKey = BigInt("3743013293544854859106160590632814054539049180873072938410675003618635700936");

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
        const manualCircomEncryptedMessageX = "7943939315577114609228521765854870274487694647408824709482650583017791805263";
        const manualCircomEncryptedMessageY = "4274951177548421489429069539060752783782923591326191876823750941839941788731";
        const manualEphemeralKeyX = "16671540487223665029263132376804418415933558003132138891380299162545394378945";
        const manualEphemeralKeyY = "4229290518462161551226337575028075279995257025678302675178028319756958529113";
        
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


        console.log("=============== Decrypted point ===============");
        // 手动输入测试值
        const encrypted_message = ["7943939315577114609228521765854870274487694647408824709482650583017791805263", "4274951177548421489429069539060752783782923591326191876823750941839941788731"];
        const ephemeral_key = ["16671540487223665029263132376804418415933558003132138891380299162545394378945", "4229290518462161551226337575028075279995257025678302675178028319756958529113"];
        const sk = "661646617256359294681698252373527273604220614134283138546703562219259151382";

        const encrypted_message_ext = babyJub.fromAffine({ x: BigInt(encrypted_message[0]), y: BigInt(encrypted_message[1]) });
        const ephemeral_key_ext = babyJub.fromAffine({ x: BigInt(ephemeral_key[0]), y: BigInt(ephemeral_key[1]) });

        // 调用 decryptFromCircom 进行解密，返回的是 BabyJubAffinePoint
        const decrypted_point = decryptFromCircom(encrypted_message_ext, ephemeral_key_ext, BigInt(sk));
        console.log("decrypted_point.x:", decrypted_point.x.toString());
        console.log("decrypted_point.y:", decrypted_point.y.toString());

        // 验证返回值的类型和格式
        expect(decrypted_point, "decrypted_point should be an object").to.be.an("object");
        expect(decrypted_point).to.have.all.keys("x", "y");
        expect(decrypted_point.x, "decrypted_point.x should be a bigint").to.be.a("bigint");
        expect(decrypted_point.y, "decrypted_point.y should be a bigint").to.be.a("bigint");
    });

});