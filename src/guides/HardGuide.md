## Goal

In **Hard mode**, you build a Bitcoin-style block candidate and search for a valid proof of work using HASH256.

> **At a glance:** choose 3 optimal transactions → build the 80-byte header → try random nonces → confirm when the hash is less than or equal to the target.

In multiplayer, every miner advances their own chain; the first to reach the block goal wins.

## 1. Choose and order the transactions

The economic rule is the same as in Easy mode: choose **exactly three affordable transactions** with the highest possible total fees.

- Every sender must cover **amount + fee**.
- Costs from multiple transactions with the same sender add together.
- All groups tied at the maximum fee total are valid.
- An unaffordable transaction is rejected immediately; the group is checked for optimality on the first mining attempt.

Selection order matters: it becomes part of the candidate payload and can change both the Merkle root and the block hash.

Transactions use an educational encoding rather than Bitcoin’s complete binary wire format. Each payload includes sender, receiver, amount, fee and date, then receives HASH256. The raw 32-byte hashes form the Merkle tree; when a level has an odd number of hashes, its last hash is duplicated.

## 2. Build the Bitcoin header

The candidate uses the six Bitcoin header fields in their fixed 80-byte layout:

```text
version | previous block hash | Merkle root | timestamp | nBits | nonce
 4 B    |        32 B         |    32 B     |    4 B    |  4 B  |  4 B
```

Integer fields use little-endian encoding. The previous block hash and Merkle root are inserted in internal byte order. The compact `nBits` value defines the complete 256-bit target.

## 3. Search for proof of work

Every press of **Roll the dice** generates a random 32-bit nonce and calculates:

```text
first digest  = SHA256(80-byte header)
second digest = SHA256(first digest)
displayed hash = second digest with its bytes reversed
```

The four smaller dice are only a visual representation of one attempt; their faces do not encode the nonce. Each press checks exactly one nonce.

The proof is valid when the displayed hash is numerically **less than or equal to the target**. At game creation, targets are drawn with secure randomness from three nearby difficulties (25% harder, 50% standard, 25% easier) and saved for the match. Every miner in a room gets the same target for a given block; a reset draws a new sequence. Typical medians range from about 36 to 59 attempts, but individual searches can be much shorter or longer.

The HASH256 verifier exposes the header, both SHA-256 rounds and the final comparison.

## 4. Confirm and link the block

After finding a valid proof, press **Mine block**. The confirmed hash becomes the next block’s previous hash, and the simulated timestamp advances by ten minutes.

Confirmed transactions leave the mempool, unconfirmed ones remain and three new transactions arrive. Fees are recorded as a statistic; only mined blocks determine the winner.

> Bitcoin recalculates difficulty every 2,016 blocks. This game's small per-block variation is an educational pacing choice, not Bitcoin's actual retargeting rule.
