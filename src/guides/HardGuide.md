# Bitcoin Block Mining Simulator (Hard Mode)

A simulator with real double SHA-256 proof-of-work and the same mempool rules as Easy mode.

## Overview

You **manually** select transactions, then **roll the dice** to try random nonces until `SHA256(SHA256(raw transactions) + nonce)` satisfies the block target. Each roll is one independent guess (not nonce 1, 2, 3… in sequence). Transaction selection rules are identical to Easy mode; only the mining puzzle changes.

## Transaction selection rules

1. **Exactly three transactions.** You choose which three rows to include; the game never fills them automatically.

2. **Sufficient balance.** Each sender must cover `amount + fee`. Multiple selections from the same sender add their costs against that sender's balance.

3. **Fee priority (step by step).** When you still need *k* transactions (k = 3 minus already selected), among remaining **affordable** transactions you may click only those in the **top k by fee** (highest fees first; ties broken by the lower transaction id). Others remain unavailable until higher-fee options are taken or fail the balance check.

## Cryptographic rules (after selection)

4. **Raw string.** Concatenate the selected transactions as `SenderToReceiverAmountDate`, joined with `-` (in the order you selected them).

5. **Double SHA-256.** `txHash = SHA256(raw)` then `finalHash = SHA256(txHash + nonce)`.

6. **Target.** A valid roll requires `finalHash` to begin with enough leading hexadecimal zeros (shown on screen). The block target hash is displayed as on real networks; in this educational build, the leading-zero prefix is the main success criterion (about 1 in 16 rolls).

7. **Proof of work (dice).** Press **Roll the dice**. Two dice appear and a **random nonce** is chosen for that roll; the game computes the hash. Each roll is one attempt, as in real mining. When the hash is valid, click **Mine block** to commit.

## How to play

1. **Mempool.** Select three transactions following the balance and fee-priority rules.

2. **Inspect.** With three transactions selected, review the transaction hash (`txHash`).

3. **Roll the dice.** Keep rolling until `finalHash` is valid (status turns green). Typical luck: about **11 rolls** (median); 9 in 10 players succeed within about 38 rolls.

4. **Commit.** Click **Mine block** when proof of work succeeds.

5. **Hash checker.** Optionally paste the raw data and nonce in the SHA-256 panel to verify the calculation by hand.
