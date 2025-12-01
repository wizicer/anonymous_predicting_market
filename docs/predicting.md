---
marp: true
theme: academic
paginate: true
size: 16:9
math: true
---

<!-- _class: title -->

# Anonymous Predicting Market

Shuang Liang
_2025.11_

---

<!-- _class: toc -->

**Table of Contents**

- Introduction
- Threat Model
- Design
- Challenges
- Unsettled Problems


<!--

TODO:

- 赔率曲线 -->


---

<!-- _header: Setup -->
<!-- _class: small -->
## Goal

构建一个具备隐私保护的预测市场：

- 隐藏下注方向
- 仅需一次上链交互
- 任何party都无法提前获知方向
- 开奖时可验证赔率与收益

其他说明：

- 不隐藏金额：这个需求可以简单由前置tornado cash实现
- 下注时需要质押下注金额
- 初步实现时选择最简单的赔率曲线

---

<!-- _header: Setup -->
<!-- _class: extra-small -->
# Threat Model

系统运行在一个公链环境中，**用户、阈值委员会成员、结果提议者** 共同参与市场流程。
所有参与者均被视为 **不可信但具经济理性**，目标是最大化自身收益。

<div class="columns">
<div>

## 潜在对手能力（行为）

- ~~**提前合谋解密**~~：部分阈值节点可能合作在截止前恢复下注方向。
- **构造非法下注**：用户可能提交无效密文、错误方向或与承诺不一致的数据。
- **批量结果操纵**：提交者可能提交不完整或被篡改的批量解密结果以影响赔率。
- ~~**结果提议操纵**~~：攻击者可能提议错误的事件结果或试图干扰正确结果的提议流程。
- **阻断结算**：恶意参与者可能延迟或阻碍批量结果提交，影响市场最终结算。

</div>
<div>

## 系统假设

- **阈值委员会去中心化**：没有单一实体能控制达到解密门限的节点集合。
- **Oracle 采用可挑战机制**：如提议/挑战/保证金模型确保结果可信。
- **区块链执行可信**：智能合约按预期执行，链级攻击不在威胁范围内。

</div>
</div>

---

<!-- _header: Design -->
<!-- _class: small -->
## 系统总体结构

核心组成：

1. **PredictionMarket 合约**
   记录下注密文与 commitment，最终结算赔率与收益
2. **ZK 证明体系**
   - *ZK-Bet*：下注合法性
   - *ZK-BatchOpen*：批量验证 commitment 一致性
3. **阈值解密委员会 + Oracle**
   延迟解密与结果输入

---

<!-- _header: Design -->
<!-- _class: small -->
## 合约设计（1/2）

### 市场创建
- 指定 `oracle`, `PK`, `bet_deadline`, `resolution_time`, `salt`

### 下注阶段（用户唯一交互）

<div class="columns">
<div>

用户提交：
- 用户地址 `address`
- 下注金额 `amount`
- 加密密文 `ct`
- 承诺值 `comm`
- ZK 证明 `zkProof`

</div>
<div>

合约执行：
1. 验证 ZK 证明
2. 存储 `(amount, ct_hash, comm)`
3. 更新总额，截止后冻结市场

</div>
</div>

---

<!-- _header: Design -->
<!-- _class: small -->
## 合约设计（2/2）

### 开奖阶段
1. **阈值解密委员会**：
   - 拉取密文
   - 生成部分解密与批量 ZK 证明
2. **提交批量结果**：
   - 提交 `(sum_0, sum_1)` 与证明
   - 合约验证并更新池总额
3. **Oracle 提供结果**
4. **合约计算与分配收益**

---

<!-- ## 零知识证明体系 -->

<!-- _header: Design: ZK -->
<!-- _class: small -->
### ZK-Bet（下注时）

证明用户下注构造合法：

- public inputs: `PK`, `comm`, `amount`, `address`, `salt`
- private inputs: `side`
- public outputs: `ct`
- statement：
  1. `side ∈ {0,1}`
  2. `ct = Enc_PK([side, address])`
  3. `comm = Poseidon(salt || side || amount || address)`
  4. amount in range

---

<!-- _header: Design: ZK -->
<!-- _class: small -->
### ZK-BatchOpen（开奖时）

证明批量解密结果与链上承诺一致：

- pre-step: $\forall ct \in [ct]$: `[side, address] = Dec_PK(ct)`
- public inputs: `[comm]`, `[amount]`, `salt`
- private inputs: `[side]`, `[address]`
- public outputs：`sum₀`, `sum₁`
- statement：
  1. $\forall comm \in [comm]$: `comm = Poseidon(side || salt || amount || address)`
  2. $\forall side \in [side]$: `side ∈ {0,1}`
  3. $\forall side,amount \in [side,amount]$: $sum_i = \sum f_i(side) amount$

---


<!-- _header: Design -->
<!-- _class: small -->
## 数据流与角色关系

TODO:


---

<!-- _class: lead -->
## Thank you!
