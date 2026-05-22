import { canSelectTransaction } from './txSelection.js';

/** True if some sequence of 3 picks is allowed by fee/balance rules. */
export function canCompleteBlockSelection(mempool, balances) {
  const tryPick = (selected) => {
    if (selected.length === 3) return true;
    for (const tx of mempool) {
      if (selected.includes(tx.id)) continue;
      if (canSelectTransaction(tx.id, mempool, selected, balances)) {
        if (tryPick([...selected, tx.id])) return true;
      }
    }
    return false;
  };
  return tryPick([]);
}

/** Greedy pick matching typical player behaviour (highest fee first). */
export function pickGreedySelection(mempool, balances) {
  const selected = [];
  const sorted = [...mempool].sort((a, b) => b.fee - a.fee || a.id - b.id);
  for (const tx of sorted) {
    if (selected.length >= 3) break;
    if (canSelectTransaction(tx.id, mempool, selected, balances)) {
      selected.push(tx.id);
    }
  }
  return selected;
}
