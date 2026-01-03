import { buildPoseidonOpt } from "circomlibjs";
import { BabyJubExtPoint } from ".";

// 缓存 poseidon 实例，避免重复构建
let poseidonInstance: any = null;
let poseidonInitPromise: Promise<any> | null = null;

/**
 * 初始化 Poseidon 实例（异步，需要在应用启动时调用）
 * 这个函数只需要调用一次，之后所有同步函数都可以使用 poseidon 实例
 */
export async function initPoseidon(): Promise<void> {
    if (!poseidonInstance && !poseidonInitPromise) {
        poseidonInitPromise = buildPoseidonOpt().then((instance) => {
            poseidonInstance = instance;
            poseidonInitPromise = null;
            return instance;
        });
        await poseidonInitPromise;
    } else if (poseidonInitPromise) {
        await poseidonInitPromise;
    }
}

/**
 * 同步获取 Poseidon 实例
 * 如果未初始化，会抛出错误
 */
function getPoseidon(): any {
    if (!poseidonInstance) {
        throw new Error("Poseidon instance not initialized. Please call initPoseidon() first.");
    }
    return poseidonInstance;
}

/**
 * 计算 Poseidon(encodedSidePoint[0] || encodedSidePoint[1] || side || salt || amount || address)
 * 与 Circom 电路中的实现保持一致：
 *   component commHash = Poseidon(6);
 *   commHash.inputs[0] <== encodedSidePoint[0];
 *   commHash.inputs[1] <== encodedSidePoint[1];
 *   commHash.inputs[2] <== side;
 *   commHash.inputs[3] <== salt;
 *   commHash.inputs[4] <== amount;
 *   commHash.inputs[5] <== address;
 * 
 * @param encodedSidePoint 编码后的 side 点，[bigint, bigint]
 * @param side 下注方向 (0 或 1)
 * @param salt 随机盐值，十进制字符串格式
 * @param amount 下注金额（整数，通常为 number，单位如 wei/satoshi 等，不支持浮点数）
 * @param address 用户地址，160 bits (20 bytes)，十进制字符串格式
 * @returns Poseidon 哈希结果，返回 bigint（十进制格式）
 */
export function poseidonHashBet(
    encodedSidePoint: BabyJubExtPoint,
    side: number,
    salt: string,
    amount: number,
    address: string,
): bigint {
    // 获取 Poseidon 实例（同步）
    const poseidon = getPoseidon();
    
    // 将输入转换为 bigint（域元素）
    // Poseidon 哈希需要域元素作为输入
    
    // 将 side 转换为 bigint (0 或 1)
    const sideBigInt = BigInt(side);
    
    // 将 salt 转换为 bigint（salt 已经是十进制字符串格式）
    const saltBigInt = BigInt(salt);
    
    // 将 amount 转换为 bigint
    const amountBigInt = BigInt(amount);
    
    // 将 address 转换为 bigint（address 已经是十进制字符串格式）
    const addressBigInt = BigInt(address);
    
    // 创建 Poseidon 哈希输入数组（6个输入：encodedSidePoint.x, encodedSidePoint.y, side, salt, amount, address）
    // 顺序与电路一致
    const inputs = [encodedSidePoint.x, encodedSidePoint.y, sideBigInt, saltBigInt, amountBigInt, addressBigInt];
    
    // 调用 Poseidon 哈希（6个输入）
    // circomlibjs 的 poseidon 函数返回域元素，需要转换为 bigint
    const hashResult = poseidon(inputs);
    
    // 将域元素转换为 bigint
    // poseidon.F 是域对象，使用 F.toString() 方法将域元素转换为十进制字符串
    const F = poseidon.F;
    const hashString = F.toString(hashResult);
    const hashBigInt = BigInt(hashString);
    
    // 返回哈希结果（bigint，十进制格式）
    return hashBigInt;
}

