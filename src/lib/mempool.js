import { USERS, TX_PER_BLOCK, INITIAL_BALANCE } from './gameConstants.js';
import { createSeededRandom } from './seededRandom.js';
import { canCompleteBlockSelection } from './playability.js';

const MIN_RESERVE = 18;
const MIN_BALANCE_TARGET = 22;

/**
 * Keeps marathon games playable: if anyone is broke, rebalance total supply
 * evenly (fees drain the economy over many blocks).
 */
export function stabilizeBalances(balances) {
  const next = { ...balances };
  let total = USERS.reduce((s, u) => s + next[u], 0);
  const targetTotal = USERS.length * INITIAL_BALANCE;

  if (total < targetTotal * 0.65) {
    let topUp = targetTotal - total;
    USERS.forEach((u, i) => {
      const add =
        i === USERS.length - 1
          ? topUp
          : Math.floor((targetTotal - total) / USERS.length);
      next[u] += add;
      topUp -= add;
    });
    total = USERS.reduce((s, u) => s + next[u], 0);
  }

  const minBal = Math.min(...USERS.map((u) => next[u]));
  const fairShare = total / USERS.length;

  if (minBal >= MIN_BALANCE_TARGET && minBal >= fairShare * 0.35) {
    return next;
  }

  let remainder = total;
  USERS.forEach((u, i) => {
    const share =
      i === USERS.length - 1
        ? remainder
        : Math.floor(total / USERS.length);
    next[u] = share;
    remainder -= share;
  });
  return next;
}

function makeTx({ id, displayId, sender, receiver, amount, fee, txDate }) {
  const tx = { id, displayId, sender, receiver, amount, fee };
  if (txDate != null) tx.date = txDate;
  return tx;
}

function affordableAmountFee(balances, sender, rng, preferHighFee = false) {
  const bal = balances[sender];
  const reserve = MIN_RESERVE;
  const maxSpend = Math.max(8, bal - reserve);
  let amount = preferHighFee
    ? Math.min(30, Math.floor(maxSpend * 0.45))
    : Math.floor(rng() * Math.min(28, maxSpend - 6)) + 6;
  if (amount < 6) amount = 6;
  if (amount + 6 > maxSpend) amount = Math.max(6, maxSpend - 8);

  const maxFee = Math.max(1, bal - amount - reserve);
  let fee = preferHighFee
    ? Math.min(10, Math.max(5, maxFee))
    : Math.floor(rng() * Math.min(10, maxFee)) + 1;
  if (fee < 1) fee = 1;
  if (fee > maxFee) fee = maxFee;
  return { amount, fee };
}

/**
 * Fallback mempool: 3 high-fee affordable txs + filler txs so the block is always minable.
 */
function buildPlayableFallback({
  balances,
  blockNum,
  roomSeed,
  txDate,
  combs,
  numTxs,
}) {
  const rng = createSeededRandom(`${roomSeed || 'solo'}-fallback-${blockNum}`);
  const stable = stabilizeBalances(balances);
  const simulatedBalances = { ...stable };
  const pool = [];

  const sendersByBal = [...USERS].sort(
    (a, b) => simulatedBalances[b] - simulatedBalances[a],
  );
  const miningSenders = [];
  for (const u of sendersByBal) {
    if (simulatedBalances[u] >= 10 && !miningSenders.includes(u)) {
      miningSenders.push(u);
    }
  }
  while (miningSenders.length < 3) {
    miningSenders.push(sendersByBal[miningSenders.length % USERS.length]);
  }

  const miningSlots = [0, 1, 2].map((i) => {
    const sender = miningSenders[i];
    let receiver = USERS[(USERS.indexOf(sender) + 1 + i) % USERS.length];
    if (receiver === sender) receiver = USERS[(USERS.indexOf(receiver) + 1) % USERS.length];
    const bal = simulatedBalances[sender];
    const amount = Math.min(12, Math.max(5, Math.floor(bal * 0.15)));
    let fee = Math.max(8 - i, 3);
    const maxFee = Math.max(1, bal - amount - 8);
    if (fee > maxFee) fee = maxFee;
    if (fee < 1) fee = 1;
    if (bal >= amount + fee + 5) {
      simulatedBalances[sender] -= amount + fee;
      simulatedBalances[receiver] += amount;
    }
    return makeTx({
      id: blockNum * 100 + i,
      displayId: i + 1,
      sender,
      receiver,
      amount,
      fee,
      txDate,
    });
  });

  pool.push(...miningSlots);

  for (let i = 3; i < numTxs; i++) {
    const { sender, receiver } = combs[i];
    const { amount, fee } = affordableAmountFee(simulatedBalances, sender, rng);
    if (simulatedBalances[sender] >= amount + fee + MIN_RESERVE) {
      simulatedBalances[sender] -= amount + fee;
      simulatedBalances[receiver] += amount;
    }
    pool.push(
      makeTx({
        id: blockNum * 100 + i,
        displayId: i + 1,
        sender,
        receiver,
        amount: Math.min(amount, Math.max(6, simulatedBalances[sender] - fee - MIN_RESERVE)),
        fee,
        txDate,
      }),
    );
  }

  return pool;
}

/**
 * Build a mempool for one block. Same seed + blockNum => same transactions (multiplayer sync).
 */
export function generateMempool({
  balances,
  blockNum = 1,
  roomSeed = '',
  requireVariance = true,
  txDate = null,
}) {
  const stableBalances = stabilizeBalances(balances);
  const users = USERS;
  const rng = createSeededRandom(`${roomSeed || 'solo'}-block-${blockNum}`);
  const numTxs = users.length * (users.length - 1);

  const combs = [];
  for (const s of users) {
    for (const r of users) {
      if (s !== r) combs.push({ sender: s, receiver: r });
    }
  }

  for (let i = combs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [combs[i], combs[j]] = [combs[j], combs[i]];
  }

  const cheaterIndex = Math.floor(rng() * numTxs);
  let attempts = 0;

  while (attempts < 10000) {
    attempts++;
    const cheater = Math.floor(rng() * numTxs);
    const simulatedBalances = { ...stableBalances };
    const pool = [];

    for (let i = 0; i < numTxs; i++) {
      const isCheater = requireVariance ? i === cheater : i === cheaterIndex;
      const { sender, receiver } = combs[i];
      let amount;
      let fee;

      if (isCheater) {
        const currentBal = simulatedBalances[sender];
        amount = currentBal + Math.floor(rng() * 20) + 5;
        if (amount < 20) amount = 20 + Math.floor(rng() * 20);
        fee = Math.floor(rng() * 10) + 1;
      } else {
        const diff = simulatedBalances[sender] - simulatedBalances[receiver];
        amount = Math.round(30 + diff / 3);
        if (amount < 20) amount = 20 + Math.floor(rng() * 10);
        if (amount > 70) amount = 70 - Math.floor(rng() * 10);

        const currentBal = simulatedBalances[sender];
        if (amount >= currentBal - MIN_RESERVE) {
          amount = Math.max(6, currentBal - MIN_RESERVE - 8);
        }

        const maxFee = currentBal - amount - MIN_RESERVE;
        fee = Math.floor(rng() * Math.min(10, Math.max(1, maxFee))) + 1;
        if (fee < 1) fee = 1;
        if (fee > maxFee) fee = Math.max(1, maxFee);

        if (simulatedBalances[sender] >= amount + fee + MIN_RESERVE) {
          simulatedBalances[sender] -= amount + fee;
          simulatedBalances[receiver] += amount;
        }
      }

      pool.push(
        makeTx({
          id: blockNum * 100 + i,
          displayId: i + 1,
          sender,
          receiver,
          amount,
          fee,
          txDate,
        }),
      );
    }

    if (!requireVariance) {
      if (canCompleteBlockSelection(pool, stableBalances)) return pool;
      continue;
    }

    const vals = users.map((u) => simulatedBalances[u]);
    const mean = vals.reduce((a, b) => a + b, 0) / users.length;
    const variance =
      vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / users.length;
    if (variance <= 225 && canCompleteBlockSelection(pool, stableBalances)) return pool;
  }

  return buildPlayableFallback({
    balances: stableBalances,
    blockNum,
    roomSeed,
    txDate,
    combs,
    numTxs,
  });
}

/** After mining in Hard mode: remove selected txs and add new ones. */
export function replenishMempool(mempool, balances, blockNum, roomSeed) {
  const stableBalances = stabilizeBalances(balances);
  const rng = createSeededRandom(`${roomSeed || 'solo'}-replenish-${blockNum}`);
  const users = USERS;
  let maxId = Math.max(0, ...mempool.map((t) => t.id));
  const simulatedBalances = { ...stableBalances };

  const newTxs = [];
  for (let i = 0; i < TX_PER_BLOCK; i++) {
    const validSenders = users.filter((u) => simulatedBalances[u] >= MIN_RESERVE + 10);
    const sender =
      validSenders.length > 0
        ? validSenders[Math.floor(rng() * validSenders.length)]
        : users.reduce((best, u) =>
            simulatedBalances[u] > simulatedBalances[best] ? u : best,
          users[0]);
    let receiver = sender;
    while (receiver === sender) {
      receiver = users[Math.floor(rng() * users.length)];
    }

    const { amount, fee } = affordableAmountFee(simulatedBalances, sender, rng, i === 0);
    if (simulatedBalances[sender] >= amount + fee + MIN_RESERVE) {
      simulatedBalances[sender] -= amount + fee;
    }

    newTxs.push({
      id: maxId + i + 1,
      sender,
      receiver,
      amount,
      fee: fee + (TX_PER_BLOCK - i),
      date: '202605',
    });
  }

  const next = [...mempool, ...newTxs].map((tx, i) => ({
    ...tx,
    displayId: i + 1,
  }));
  if (canCompleteBlockSelection(next, stableBalances)) return next;

  return generateMempool({
    balances: stableBalances,
    blockNum,
    roomSeed: `${roomSeed}-replenish-fallback`,
    requireVariance: true,
    txDate: '202605',
  });
}
