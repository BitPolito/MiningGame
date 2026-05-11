# Bitcoin Block Mining Simulator

A simple simulator that gamifies the core mechanics of the Bitcoin protocol, including the mempool, transaction selection, and proof-of-work mining.

## Overview

This application demonstrates how Bitcoin miners select transactions from the mempool and solve mathematical puzzles to append new blocks to the blockchain. Players act as miners who must adhere to the protocol's rules to successfully mine a block and update the global ledger.

## Rules (Based on the Bitcoin Protocol)

1. **Transaction Validity**: A transaction is only valid if the sender has sufficient balance to cover both the transaction amount and the associated miner fee.
2. **Mempool**: Unconfirmed transactions broadcasted to the network are held in the mempool.
3. **Transaction Selection (Fee Market)**: Miners are economically incentivized to maximize their profit. Therefore, you must select transactions with the highest miner fees. In the event of a tie in fees, prioritize older transactions (represented by lower transaction IDs or earlier appearance).
4. **Block Size Limit**: In this simulation, each block can contain exactly 3 transactions, mirroring Bitcoin's block weight limit in a simplified manner.
5. **Proof of Work (Mining)**: To mine a block, a miner must find a "Nonce" (Number used once) that, when combined with the block's data, satisfies the network's difficulty target. 
6. **Immutable Ledger**: Once a block is successfully mined, the transactions are processed, and the balance sheet is updated. Previous blocks form a chain that cannot be altered.

## Steps to Play

1. **Review the Mempool**: Observe the unconfirmed transactions available in the mempool. Some transactions might be invalid or attempt to spend more than the available balance.
2. **Select Transactions**: Choose exactly 3 valid transactions. You must strictly follow the fee priority rule, picking the ones with the highest fees.
3. **Check Balances**: Ensure that the senders have enough balance to cover the total amount and fees for all your selected transactions. The system will reject invalid selections.
4. **Calculate Block Value**: The application computes a block value based on the selected transactions' amounts, fees, and the mathematical values of the sender and receiver names:  
   `Sender Names Number + Receiver Names Number + Amount of BTCs + Fees = Block Value` 
5. **Find the Nonce**: Guess a positive number for the Nonce. Your goal is to satisfy the equation:  
   `Previous Target + Nonce + Block Value = Current Target`
6. **Mine the Block**: Submit your Nonce. If the equation holds true, the block is successfully mined, balances are updated, and the network advances to the next block with a new target. If incorrect, try another Nonce.

## Setup and Running Locally
By https://bitpolito-mining-game.vercel.app  

Or for running this simulator on your local machine:

1. Navigate to the project directory.
2. Install the dependencies:
   npm install
3. Start the development server:
   npm run dev
4. Open the provided localhost URL in your web browser.

