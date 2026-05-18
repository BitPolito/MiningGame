# Bitcoin Block Mining Simulator 

A high-fidelity simulator that authentically replicates the core mechanics of the Bitcoin protocol, including the mempool, transaction selection, and the genuine double SHA-256 proof-of-work algorithm.

## Overview

This application acts as a true-to-life representation of Bitcoin mining. It requires the player to select the most profitable transactions, bundle them into raw strings, and engage an automated SHA-256 hashing loop to brute-force a valid block hash that meets the network's difficulty criteria.

## Rules (Based on the Bitcoin Protocol)

1. **Transaction Validity**: A transaction is only valid if the sender has sufficient balance to cover the transaction amount and miner fee.
2. **Mempool**: Unconfirmed transactions broadcasted to the network are held in the mempool.
3. **Transaction Selection (Fee Market)**: Miners are economically incentivized to maximize profit. You must select exactly 3 transactions with the highest miner fees.
4. **The Target Hash (Difficulty)**: The network algorithmically generates a 64-character hexadecimal target string. To be valid, a block's final hash must be numerically lower than this target hash (which generally means it must start with a specific number of leading zeros).
5. **Double SHA-256 Hashing**: Bitcoin uses a two-step hashing process. First, the raw transaction data is hashed. Second, a "nonce" is appended to this first hash, and the combined string is hashed *again* to produce the final block hash.
   `Final Hash = SHA256( SHA256(Raw_Transactions) + Nonce )`
6. **Proof of Work (Mining)**: A miner must rapidly increment the "Nonce" (Number used once) and recalculate the final hash until the output is smaller than the Target Hash.

## Steps to Play

1. **Review the Mempool**: Observe the unconfirmed transactions. The mempool may contain fraudulent transactions attempting to spend unbacked funds.
2. **Select Transactions**: Pick exactly 3 valid transactions by strictly following the fee priority rule. The system will reject invalid selections.
3. **View the Cryptographic State**: Once selected, the system will generate your raw transaction string and the initial Transaction Hash. It will also generate the network's Target Hash for the current block.
4. **Start Mining**: Click "Start to increase nonce". Your computer will begin rapidly hashing the data, incrementing the nonce automatically on each attempt.
5. **Live Verification**: You can use the "Live SHA-256 Verifier" panel at the bottom to manually input the raw transaction string and nonce to verify that the cryptographic math is authentic and accurate.
6. **Mine the Block**: Once the algorithm randomly discovers a nonce that produces a valid hash with the required leading zeros, the mining will complete. Click "MINE BLOCK!" to broadcast the block, update the global balance sheet, and advance the blockchain!
