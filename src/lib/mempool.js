import { USERS } from './gameConstants.js';
import { createSeededRandom } from './seededRandom.js';
import { getValidBlockSelections, isSelectionAffordable } from './txSelection.js';

const CORE_FEES = [8, 7, 6, 4];
const FILLER_FEES = [5, 4, 3, 3, 2, 2, 1, 1, 1];

function txDate(blockNum) {
  return `2026/05/${String(blockNum).padStart(2, '0')}`;
}

function shuffled(items, rng) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function receiverFor(sender, balances, rng) {
  const receivers = USERS
    .filter((name) => name !== sender)
    .sort((a, b) => balances[a] - balances[b] || a.localeCompare(b));
  return receivers[Math.floor(rng() * Math.min(2, receivers.length))];
}

function allocateTransactions({ balances, fees, rng, startId, blockNum, reserved = [] }) {
  const remaining = { ...balances };
  for (const tx of reserved) {
    remaining[tx.sender] -= tx.amount + tx.fee;
  }

  return fees.map((fee, index) => {
    const candidates = USERS
      .filter((name) => remaining[name] >= fee + 2)
      .sort((a, b) => remaining[b] - remaining[a] || a.localeCompare(b));
    const sender = candidates[0] ?? USERS.reduce(
      (best, name) => remaining[name] > remaining[best] ? name : best,
      USERS[0],
    );
    const affordable = Math.max(1, remaining[sender] - fee);
    const amount = Math.min(8, Math.max(1, Math.floor(affordable / 4)));
    const receiver = receiverFor(sender, balances, rng);
    remaining[sender] -= amount + fee;
    return {
      id: startId + index,
      sender,
      receiver,
      amount,
      fee,
      date: txDate(blockNum),
    };
  });
}

function finalizePool(pool, rng) {
  return shuffled(pool, rng).map((tx, index) => ({ ...tx, displayId: index + 1 }));
}

function strategicQuality(pool, balances) {
  const valid = getValidBlockSelections(pool, balances);
  if (valid.length < 2) return false;
  const maximum = Math.max(...valid.map((selection) => selection.totalFees));
  if (valid.filter((selection) => selection.totalFees === maximum).length !== 1) return false;
  const topThree = [...pool]
    .sort((a, b) => b.fee - a.fee || a.id - b.id)
    .slice(0, 3);
  return topThree.length === 3 && (
    !isSelectionAffordable(topThree, balances)
    || topThree.reduce((sum, tx) => sum + tx.fee, 0) < maximum
  );
}

function conflictPair({ sender, balance, fees, startId, blockNum, rng, conflictsWithCost = null }) {
  const firstCost = conflictsWithCost == null
    ? Math.max(fees[0] + 1, Math.floor(balance * 0.58))
    : Math.max(fees[0] + 1, balance - conflictsWithCost + 1);
  const secondFee = fees[1] ?? fees[0];
  const secondCost = Math.max(secondFee + 1, balance - firstCost + 1);
  const receiverBalances = Object.fromEntries(
    USERS.map((name) => [name, name === sender ? balance : balance + 1]),
  );
  return fees.map((fee, index) => ({
    id: startId + index,
    sender,
    receiver: receiverFor(sender, receiverBalances, rng),
    amount: Math.max(1, (index === 0 ? firstCost : secondCost) - fee),
    fee,
    date: txDate(blockNum),
  }));
}

function buildInitialPool({ balances, blockNum, roomSeed }) {
  const rng = createSeededRandom(`${roomSeed || 'solo'}-mempool-${blockNum}`);
  const startId = blockNum * 100;
  const orderedUsers = shuffled(USERS, rng)
    .sort((a, b) => (balances[b] ?? 0) - (balances[a] ?? 0));
  const core = CORE_FEES.map((fee, index) => {
    const sender = orderedUsers[index % orderedUsers.length];
    const available = Math.max(1, (balances[sender] ?? 0) - fee);
    return {
      id: startId + index,
      sender,
      receiver: receiverFor(sender, balances, rng),
      amount: Math.min(8, Math.max(1, Math.floor(available / 6))),
      fee,
      date: txDate(blockNum),
    };
  });
  const conflict = conflictPair({
    sender: core[0].sender,
    balance: balances[core[0].sender] ?? 0,
    fees: [10],
    startId: startId + core.length,
    blockNum,
    rng,
    conflictsWithCost: core[0].amount + core[0].fee,
  });
  const fillers = FILLER_FEES.map((fee, index) => {
    const sender = USERS[(index + Math.floor(rng() * USERS.length)) % USERS.length];
    const receiver = receiverFor(sender, balances, rng);
    const maxAmount = Math.max(1, (balances[sender] ?? 0) - fee);
    return {
      id: startId + core.length + conflict.length + index,
      sender,
      receiver,
      amount: Math.min(10, Math.max(1, Math.floor(maxAmount / 5))),
      fee,
      date: txDate(blockNum),
    };
  });
  const invalidSender = USERS[Math.floor(rng() * USERS.length)];
  const invalid = {
    id: startId + core.length + conflict.length + fillers.length,
    sender: invalidSender,
    receiver: receiverFor(invalidSender, balances, rng),
    amount: (balances[invalidSender] ?? 0) + 5,
    fee: 1,
    date: txDate(blockNum),
  };
  const pool = finalizePool([...core, ...conflict, ...fillers, invalid], rng);
  if (strategicQuality(pool, balances)) return pool;
  const fallback = allocateTransactions({ balances, fees: [10, 8, 7, 6, 4, 3], rng, startId, blockNum });
  return finalizePool(fallback, rng);
}

/**
 * Build a deterministic, playable mempool. The two highest-fee choices share
 * a sender and cannot be combined, so the best block requires reasoning about
 * cumulative balances rather than simply taking the three largest fees.
 */
export function generateMempool({ balances, blockNum = 1, roomSeed = '' }) {
  return buildInitialPool({ balances: { ...balances }, blockNum, roomSeed });
}

/**
 * Keep all unconfirmed transactions, then add deterministic arrivals.
 * A full rebuild is only used
 * when no retained transaction can form an alternative valid block.
 */
export function replenishMempool(mempool, balances, blockNum, roomSeed) {
  const rng = createSeededRandom(`${roomSeed || 'solo'}-replenish-${blockNum}`);
  const retained = [...mempool];

  if (!retained.length) return buildInitialPool({ balances, blockNum, roomSeed });

  const alternative = [...retained]
    .sort((a, b) => b.fee - a.fee || a.id - b.id)
    .find((tx) => tx.amount + tx.fee <= (balances[tx.sender] ?? 0));
  if (!alternative) return buildInitialPool({ balances, blockNum, roomSeed });

  const startId = Math.max(blockNum * 100, ...mempool.map((tx) => tx.id)) + 1;
  const conflictSender = [...USERS]
    .filter((name) => name !== alternative.sender)
    .sort((a, b) => (balances[b] ?? 0) - (balances[a] ?? 0))[0] ?? USERS[0];
  const pair = conflictPair({
    sender: conflictSender,
    balance: balances[conflictSender] ?? 0,
    fees: [10, 9],
    startId,
    blockNum,
    rng,
  });
  const support = allocateTransactions({
    blockNum,
    balances,
    fees: [7],
    rng,
    startId: startId + pair.length,
    reserved: [alternative, ...pair],
  });
  const next = finalizePool([...retained, ...pair, ...support], rng);
  if (strategicQuality(next, balances)) return next;
  return buildInitialPool({ balances, blockNum, roomSeed: `${roomSeed}-fallback` });
}
