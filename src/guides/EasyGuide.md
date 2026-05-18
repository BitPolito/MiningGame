# Bitcoin Block Mining Simulator

A simple simulator that gamifies the core mechanics of the Bitcoin protocol, including the mempool, transaction selection, and proof-of-work mining.

## Overview

This application demonstrates how Bitcoin miners select transactions from the mempool and solve mathematical puzzles to append new blocks to the blockchain. Players act as miners who must adhere to the protocol's rules to successfully mine a block and update the global ledger.
  
## Steps to Play

1. **Review the Mempool**: Observe the unconfirmed transactions available in the mempool. Some transactions might be invalid or attempt to spend more than the available balance.
2. **Select Transactions**: Choose exactly 3 valid transactions. You must strictly follow the fee priority rule, picking the ones with the highest fees.
3. **Check Balances**: Ensure that the senders have enough balance to cover the total amount and fees for all your selected transactions. The system will reject invalid selections.
4. **Calculate Block Value**: The application computes a block value based on the selected transactions' amounts, fees, and the mathematical values of the sender and receiver names:  
  
   ```
   Block Value = Sender Names Number + Receiver Names Number + Amount of BTCs + Fees
   ```  
  
5. **Find the Nonce**: Guess a positive number for the Nonce. Your goal is to satisfy the equation:  
  
   ```
   Previous Target + Nonce + Block Value = Current Target
   ```  
     
     **Tip** : Genesis Block has 0 Target Value , based on the fact that there was no transactions!  
6. **Mine the Block**: Submit your Nonce. If the equation holds true, the block is successfully mined, balances are updated, and the network advances to the next block with a new target. If incorrect, try another Nonce.