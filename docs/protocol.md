# Anonymous Predicting Market Protocol

## Committee Setup

Committee parameters:
- Total number of committee members: $n$
- Threshold: $t$

Generate private and public keys in a decentralized manner through the DKG (Distributed Key Generation) protocol. The DKG protocol produces:

- Private keys of $n$ members: $sk_1, sk_2, \ldots, sk_n$
- Public key: $pk$

They share a private key $sk$, where the shared private key $sk$ and public key $pk$ satisfy the relationship $pk = g^{sk}$. When at least $t$ out of $n$ members are willing to participate in the sharing phase of the DKG protocol, the private key $sk$ can be recovered.

## Betting Phase

For a user with address $address_i$, when they bet $amount_i$ on a prediction direction $side_i$, the following is computed off-chain:

1. $(m_i, \beta_i) \leftarrow Prepare(side_i)$: This step prepares for the subsequent ElGamal threshold encryption, where $side_i$ is the betting direction, with range $side_i \in \\{0,1\\}$.
	- Continuously randomly generate message plaintext $m_i \overset{R}{\leftarrow}  \mathbb{G}$ until the message plaintext $m_i = (m_i.X, m_i.Y)$ satisfies on the elliptic curve that the x-coordinate satisfies
    $side_i == (m_i.X \mod 2 )$ .
	- Randomly generate $\beta_i \overset{R}{\leftarrow} \mathbb{Z}_q$
	- Output $(m_i, \beta_i)$
	
2.  $ct_i \leftarrow Enc(pk, m_i, \beta_i)$: Threshold encryption phase.
	- Compute $v_i \leftarrow g^{\beta_i}, \quad e_i \leftarrow m_i + pk^{\beta_i}$
	- Output $ct_i = (v_i, e_i) \in \mathbb{G} \times \mathbb{G}$
	
2. $comm_i = Poseidon(m_i \| side_i \| salt \| amount_i \| address_i)$: Compute commitment, where $salt$ is a globally public random salt.
3. $(\pi_i, ct_i) \leftarrow Prove(pk, comm_i, amount_i, address_i, salt;side_i, \beta_i, m_i)$: ZK Proof to prove the bet is valid. In the circuit:
	- Prove $side_i \in \\{0,1\\}$
	- Prove $amount_i > 0$
	- Prove $comm_i == Poseidon(m_i \| side_i \| salt \| amount_i \| address_i)$
	- Compute and output $ct_i := Enc(pk, m_i, \beta_i)$
4. Then, submit $(address_i, amount_i, ct_i, comm_i, \pi_i)$ on-chain.

On-chain execution:
- $1 / 0 \leftarrow Verify(\pi_i, address_i, ammount_i, ct_i, comm_i,pk)$: Verify whether the ZK Proof is valid. If the output is $1$, it indicates the proof is valid, and the on-chain bet data is recorded

$$
\\{address_i, ammount_i, ct_i, comm_i\\}
$$

If the output is $0$, the user is notified that the bet failed.

## Batch Opening Phase

In the batch opening phase, the threshold decryption committee pulls all data from the chain. If there are $M$ users' valid data on the chain in this round, the data pulled from the chain is

$$
\\{(address_i, amount_i, ct_i, comm_i)\\}_{i = 1}^{M}
$$

Off-chain computation:

- In the committee, at least $t$ members can recover the private key $sk$. This step is achieved through the DKG protocol.
- For $i = 1, \ldots, M$, compute $(side_i, m_i) \leftarrow Dec(sk, ct_i)$: Perform decryption.
	- Through $ct_i = (v_i, e_i)$ and private key $sk$, compute the encrypted plaintext $m_i$: $m_i \leftarrow e_i - v_i^{sk}$
	- Compute $side_i$: $side_i \leftarrow (m_i.X \mod 2)$
- $$(\pi_{batch}, sum_0, sum_1 ) \leftarrow BatchProve(salt, \\{(comm_i, ammount_i) \\}_{i = 1}^M; \\{side_i,address_i, m_i \\}_{i = 1}^M)$$ : Generate batch proof and output aggregated amounts. In the circuit:
	- Prove $side_i \in \\{0, 1\\}$ ($i = 1, \ldots, M$)
	- Prove $comm_i == Poseidon(m_i \| side_i \| salt \| amount_i \| address_i)$ ($i = 1, \ldots, M$)
	- Compute and output $sum_0, sum_1$,

$$
sum_0 = \sum_{i = 1}^M (1 - side_i) \times amount_i , \quad sum_1 = \sum_{i = 1}^M side_i \times amount_i
$$

Submit data $(\pi_{batch}, sum_0, sum_1)$ on-chain. On-chain computation:

- $1 / 0 \leftarrow BatchVerify(\pi_{batch}, sum_0, sum_1, salt, \\{(comm_i, amount_i)\\}_{i = 1}^M)$: Verify whether the batch proof is valid. If the output is $1$, it indicates the batch proof is valid, then continue with the following process; otherwise, output failure directly.
- Update the prize accumulation pool, update 

$$
total_0 \leftarrow total_0 + sum_0 \quad total_1 \leftarrow total_1 + sum_1
$$

Batch proofs can be obtained in batches, and the prize accumulation pool can be updated step by step until all user data is covered without duplication.

After obtaining the winning direction $winningside$ from the Oracle, proceed to the settlement and prize distribution phase:
- Compute the odds $\rho$: 

$$
\rho = \frac{total_0 + total_1}{(1 - winningside) \times total_0 + winningside \times total_1}
$$

- For each user, compute the reward. If $side_i == winningside$, then 

$$
reward_i = amount_i \times \rho, 
$$

Users call the contract to claim rewards; otherwise $reward_i = 0$.

## References

- Boneh, Dan, and Victor Shoup. "[A graduate course in applied cryptography.](https://toc.cryptobook.us/)" Draft 0.6 (2023).

