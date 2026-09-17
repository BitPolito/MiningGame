## Goal

In **Easy mode**, you build a valid block, calculate its value and manually find the nonce that completes the equation.

> **At a glance:** choose 3 affordable transactions with the highest total fees → calculate the block value → find the nonce → confirm the block.

In solo play, complete the chosen number of blocks. In multiplayer, every miner advances their own chain; the first to reach the goal wins.

## 1. Choose the transactions

Every block must contain **exactly three transactions**. A group is valid when it meets both conditions:

- every sender can cover **amount + fee**;
- its total fees are the highest among all affordable groups.

If you choose multiple transactions from the same sender, add their costs together. The three highest individual fees therefore do not necessarily make the best block. If several groups share the maximum total, all of them are valid.

### What the game checks

- An unaffordable transaction is rejected as soon as you try to select it.
- The group is checked for optimality only when you press **Mine block**.
- The best solution is not highlighted: compare the mempool with the available balances.

## 2. Calculate the block value

Assign letters the values A=1, B=2, …, Z=26. For each transaction calculate:

```text
Transaction value =
sender letter value + receiver letter value + amount + fee
```

The **block value** is the sum of the three selected transaction values. The game does not display this total; you calculate it yourself.

## 3. Find the nonce

Find a positive integer satisfying:

```text
Previous target + Nonce + Block value = Current target
```

For the first block you mine, the previous target is 0. If the nonce is wrong, the game does not reveal whether it is too high or too low.

## 4. Confirm the block

When both the selection and nonce are correct:

- payments update the balances;
- the three confirmed transactions leave the mempool;
- unconfirmed transactions remain and three new ones arrive;
- the block fees are added to your miner earnings.

Earned fees are a statistic. Only the number of mined blocks determines the winner.
