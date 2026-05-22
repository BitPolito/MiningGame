/**
 * Transaction selection rules (fee-priority + balance), shared by Easy and Hard mode.
 */

export function canAffordTx(tx, mempool, selectedTxIds, balances) {
  const senderSelectedCost = mempool
    .filter((sel) => selectedTxIds.includes(sel.id) && sel.sender === tx.sender)
    .reduce((sum, sel) => sum + sel.amount + sel.fee, 0);
  return senderSelectedCost + tx.amount + tx.fee <= balances[tx.sender];
}

/** IDs the player may pick next under fee-priority rules. */
export function getAllowedNextTxIds(mempool, selectedTxIds, balances) {
  if (selectedTxIds.length >= 3) return [];

  const validUnselectedTxs = mempool.filter((t) => {
    if (selectedTxIds.includes(t.id)) return false;
    return canAffordTx(t, mempool, selectedTxIds, balances);
  });

  const needed = 3 - selectedTxIds.length;
  if (needed <= 0 || validUnselectedTxs.length === 0) return [];

  const sorted = [...validUnselectedTxs].sort((a, b) => {
    if (b.fee !== a.fee) return b.fee - a.fee;
    return a.id - b.id;
  });

  return sorted.slice(0, needed).map((t) => t.id);
}

/**
 * Row visual state for mempool UI.
 * @returns {'selected'|'eligible'|'locked'|'invalid'|'full'}
 */
export function getTxRowState(txId, mempool, selectedTxIds, balances) {
  if (selectedTxIds.includes(txId)) return 'selected';
  if (selectedTxIds.length >= 3) return 'full';

  const tx = mempool.find((t) => t.id === txId);
  if (!tx || !canAffordTx(tx, mempool, selectedTxIds, balances)) return 'invalid';

  const allowed = getAllowedNextTxIds(mempool, selectedTxIds, balances);
  return allowed.includes(txId) ? 'eligible' : 'locked';
}

export function getRejectReasonKey(txId, mempool, selectedTxIds, balances) {
  const state = getTxRowState(txId, mempool, selectedTxIds, balances);
  if (state === 'invalid') return 'errTxBalance';
  if (state === 'locked') return 'errTxFeeOrder';
  return 'errTxGeneric';
}

/**
 * Returns true if `txId` may be added to the current selection under fee-priority
 * and cumulative balance rules (same logic as Easy mode).
 */
export function canSelectTransaction(txId, mempool, selectedTxIds, balances) {
  return getTxRowState(txId, mempool, selectedTxIds, balances) === 'eligible';
}
