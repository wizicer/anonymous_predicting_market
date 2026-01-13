---
marp: true
theme: academic
paginate: true
size: 16:9
math: true
---

<!-- _class: title -->
# Anonymous Predicting Market
#### Privacy-Preserving Betting Protocol

**Icer Liang, Jade Xie**
*2025.01*

---

<!-- _header: Motivation -->
<!-- _class: small -->
## The Problem: Transparency vs. Strategy

In current blockchain prediction markets (e.g., Polymarket), **transparency** creates game-theoretic issues:

<div class="columns">
<div class="heading">

**Current Issues**
- **Privacy Leakage**: Everyone sees *who* bet *what*.
- **Copy-Trading**: Whales are tracked; market sentiment is manipulated.
- **Asymmetric Warfare**: Adversaries can hedge or attack based on known open interest before the event concludes.

</div>

<div>
<div class="box">
<div class="title">
Our Goal
</div>

**A "Dark" Market.**
Positions are revealed only after the event closes.
</div>

- **Hidden Directions**
- **Verifiable Settlement**
- **Decentralized Trust**

</div>
</div>

---

<!-- _header: Implementation -->
<!-- _class: small -->
## System Overview

Our system operates via three main components running in the browser (clients) and on-chain.

<div class="columns">
<div class="heading">

**Roles**
- **Users**:
  - Submit ZK-proven encrypted bets.
- **Committee**:
  - Perform DKG
  - Prove ephemeral public key*
  - Disclose ephemeral private key
  - Submit ZK proofs for batch open.

</div>
<div class="heading">

**Tech Stack**:
- **React**
- **SnarkJS** (Client-side ZK)
- **WebRTC** (P2P)
- **Solidity** (Smart Contract)
- **Circom** (ZK Circuit)
- **Baby Jubjub** (Elliptic Curve)

</div>
</div>

> **⚠️ Demo Simplification:**
> *Note\*: The ephemeral public key proof is not yet implemented in the demo.*

---

<!-- _header: Step 1: Committee Setup & DKG -->
<!-- _class: small -->

Before betting starts, a committee is formed to secure the market's private key.

- **Threshold Cryptography**: $n$ members, threshold $t$.
- **Distributed Key Generation (DKG)**: Generates $pk$ (public) and fragments $sk$ (private).
$$pk = g^{sk}$$

> **⚠️ Demo Simplification:**
> Clients establish **WebRTC P2P connections** to complete DKG directly in the browser, rather than using smart contract.

---

<!-- _header: Step 2: Betting Phase (Privacy) -->
<!-- _class: small -->


<div class="box">
<div class="title">Challenge</div>

How to prove a bet is valid without revealing the direction?

</div>

<div class="columns">
<div>

**1. Encoding (Novelty)**
We encode direction $side \in \{0,1\}$ into a random elliptic curve point $m_i$:
$$
side_i == (m_i.X \mod 2)
$$

<div class="small">

*Ensures it looks random but carries the bit.*

</div>

**2. Encryption**
$$
ct_i = (v_i, e_i) = (g^{\beta_i}, \quad m_i + pk^{\beta_i})
$$

</div>
<div>

**3. ZK-Bet Circuit**
Proves validity without revealing $side_i$:
- **Validity**: $side_i \in \{0,1\}$ and $amount_i > 0$
- **Integrity**: $comm_i$ matches inputs.
- **Binding**: $ct_i$ is valid encryption.

**On-chain:** Only stores $(ct_i, comm_i)$.

</div>
</div>

---

<!-- _header: Step 3: Oracle Resolution -->
<!-- _class: small -->

Once the betting timeframe ends, the market waits for the real-world outcome.

- The Oracle submits the $winning\_side$ to the contract.

> **⚠️ Demo Simplification:**
> We use a Simplified Oracle design for this demo, skipping complex challenge periods.

---

<!-- _header: Step 4: Settlement (Batch Opening) -->
<!-- _class: small -->

Instead of decrypting bets one by one (high gas), we use **Batch Opening**.

<div class="columns">
<div class="heading">

**Off-Chain Recovery**

1. **Partial Disclosure**: Committee members reveal shares.
2. **Recovery**: Reconstruct ephemeral $sk$ from revealed shares.
3. **Decryption**: Decrypt $m_i$ using recovered $sk$:
  $$m_i \leftarrow e_i - v_i^{sk}$$
4. **Decoding**: $side_i \leftarrow (m_i.X \mod 2)$

</div>
<div class="heading">

**On-Chain Verification**

**ZK-Batch-Open Circuit** proves:
1. Decrypted data matches on-chain commitments.
2. Aggregated sums are correct:
$$sum_1 = \sum side_i \times amount_i$$

</div>
</div>


---

<!-- _header: Implementation -->
<!-- _class: small -->
## Achievement: Status

We have successfully implemented the core privacy loop.

- **Smart Contracts** `(Solidity)`
  - ✅ `PredictionMarket.sol`: Stake management, ZK verification.
- **ZK Circuits** `(Circom)`
  - ✅ `ZK-Bet`: Single user privacy.
  - ✅ `ZK-Batch-Open`: Aggregation efficiency.
- **Frontend & Interaction**
  - ✅ **MetaMask** integration.
  - ✅ **SnarkJS**: Proof generation in browser.
  - ✅ **WebRTC**: DKG & Committee P2P.

---

<!-- _class: lead -->
## Thank you!

**Live Demo:** ➡️

<!-- <div class="extra-small">

https://wizicer.github.io/anonymous_predicting_market/
</div> -->

**Demo Video:** ➡️

<!--
## 150s version

Hello everyone. Welcome to the Anonymous Prediction Market, a protocol that brings true privacy to betting using Zero-Knowledge Proofs.

The problem with current markets, like Polymarket, is transparency.
When everyone sees your bets, whales get tracked and strategies get front-run.
Our goal is to build a **'Dark' Market**.
Positions remain hidden until the event closes, ensuring fairness and preventing copy-trading.

Our system architecture involves two main roles: Users, who submit encrypted bets, and the Committee, which manages the keys.

Let's go through the steps:

First, Setup: We don't have a centralized private key.
Instead, we use a Distributed Key Generation (DKG) committee.
The private key is fragmented among members, so no single person can decrypt the market alone.

Second, Betting: Here is the cool innovation we have done on how to bet privately.
We encode the direction into the parity of a random elliptic curve point.
The user submits a ZK-Bet Proof to prove the bet is valid.
It is totally private.

Third, Oracle: Once the market times out, the Oracle submits the winning side.
We simplified this part for the demo.

Finally, Settlement: Decrypting every bet on-chain is too expensive.
Instead, the committee decrypts off-chain and one of them submits a single Batch Opening Proof.
This proves the payouts are correct without running heavy computation on the blockchain.

To summarize: We have built the complete loop.
The Smart Contract and ZK Circuits are fully functional for betting and batch opening.
Our Frontend handles the end-to-end flow.

That's the overview. Please check out the live demo or video for a detailed walkthrough.

## 100s version

Hello everyone. Welcome to the Anonymous Prediction Market, a protocol that brings true privacy to betting using Zero-Knowledge Proofs.

The problem with current markets, like Polymarket, is transparency.
Our goal is to build a **'Dark' Market**.
Positions remain hidden until the event closes, ensuring fairness and preventing copy-trading.

Our system architecture involves two main roles: Users, who submit encrypted bets, and the Committee, which manages the keys.

Let's go through the steps:

First, Setup: We don't have a centralized private key.
Instead, we use a Distributed Key Generation (DKG) committee.
The private key is fragmented among members, so no single person can decrypt the market alone.

Second, Betting: Here is the cool innovation we have done.
The user submits a ZK-Bet Proof to prove the bet is valid.
It is totally private and in the demo you will see the proving is lightning fast.

Third, Oracle: The Oracle submits the winning side.

Finally, Settlement: Decrypting every bet on-chain is too expensive.
Instead, the committee decrypts off-chain and one of them submits a single Batch Opening Proof.

To summarize: We have built the complete loop.
The Smart Contract and ZK Circuits are fully functional for betting and batch opening.

That's the overview. Please check out the live demo or video for a detailed walkthrough.

-->
