# Bitcoin Block Mining Simulator (Easy Mode)

A simplified simulator that teaches mempool selection and numeric proof-of-work.

## Overview

You play as a miner: you select transactions from the mempool, then find a nonce that satisfies the block equation. The game enforces the protocol rules but never selects transactions on your behalf.

## Transaction selection rules

These rules apply to every block. Select rows by clicking the mempool table.

1. **Exactly three transactions.** Each block must contain precisely three transactions. You decide which ones to include.

2. **Sufficient balance.** For each transaction, the sender must be able to pay `amount + fee`. If you select **more than one** transaction from the same sender, the costs **accumulate** (each additional transaction from that sender counts against their balance).

3. **Fee priority (one selection at a time).** Miners prefer higher fees. After each of your selections, consider what remains unselected and affordable:
   - Count how many slots you still need (3 minus those already selected).
   - Among affordable transactions, you may select only those with the **highest fees** for that step: as many as you still have slots available.
   - Example: you still need 2 transactions and the affordable fees are 5, 4, and 2. You may select only those with fees of 5 and 4. The transaction with fee 2 stays unavailable until a higher-fee option is taken or becomes unaffordable.

Transactions with insufficient balance cannot be selected. Transactions that are affordable but have a fee too low for the current step are rejected until the fee-priority rule allows them.

## How to play

1. **Review the mempool.** The game does not mark valid rows. An alert appears if your selection violates the balance or fee rules.

2. **Select three transactions.** Click only permitted rows. Click a selected row again to deselect it.

3. **Calculate the block value manually.** For each selected transaction, add:
   - Letter value of the sender's name (A=1 … Z=26)
   - Letter value of the receiver's name
   - Amount
   - Fee  
   Sum across all three transactions. The game does not display this total.

4. **Find the nonce.** Choose a positive nonce such that:

   ```
   Previous block target + Nonce + Block value = Current block target
   ```

   For the genesis block, the previous target is 0 (no prior block).

5. **Mine the block.** Submit your nonce. If the equation is correct, balances update and the next block receives a new target. Otherwise, try another nonce.
