/**
 * Transaction selection rules shared by Easy, Hard, solo and multiplayer.
 * A valid block contains exactly three affordable transactions and maximizes
 * the sum of their absolute fees. Selection order is preserved separately
 * because it is part of the Hard-mode candidate payload.
 */

export function getTransactionsInSelectionOrder(mempool, selectedTxIds) {
  if (!Array.isArray(selectedTxIds)) return [];
  const byId = new Map(mempool.map((tx) => [tx.id, tx]));
  return selectedTxIds.map((id) => byId.get(id)).filter(Boolean);
}

/** Spendable balances while composing a block; pending incoming funds are not spendable yet. */
export function getAvailableBalances(balances, mempool, selectedTxIds) {
  const available = { ...balances };
  for (const tx of getTransactionsInSelectionOrder(mempool, selectedTxIds)) {
    if (available[tx.sender] == null) continue;
    available[tx.sender] -= tx.amount + tx.fee;
  }
  return available;
}

export function isSelectionAffordable(transactions, balances) {
  const costs = {};
  for (const tx of transactions) {
    costs[tx.sender] = (costs[tx.sender] || 0) + tx.amount + tx.fee;
    if (costs[tx.sender] > (balances[tx.sender] ?? 0)) return false;
  }
  return true;
}

export function canAffordTx(tx, mempool, selectedTxIds, balances) {
  const selected = getTransactionsInSelectionOrder(mempool, selectedTxIds);
  return isSelectionAffordable([...selected, tx], balances);
}

export function getValidBlockSelections(mempool, balances) {
  const selections = [];
  for (let a = 0; a < mempool.length - 2; a += 1) {
    for (let b = a + 1; b < mempool.length - 1; b += 1) {
      for (let c = b + 1; c < mempool.length; c += 1) {
        const transactions = [mempool[a], mempool[b], mempool[c]];
        if (!isSelectionAffordable(transactions, balances)) continue;
        selections.push({
          ids: transactions.map((tx) => tx.id),
          transactions,
          totalFees: transactions.reduce((sum, tx) => sum + tx.fee, 0),
        });
      }
    }
  }
  return selections;
}

export function getMaximumFeeTotal(mempool, balances) {
  const valid = getValidBlockSelections(mempool, balances);
  return valid.length ? Math.max(...valid.map((selection) => selection.totalFees)) : null;
}

export function evaluateBlockSelection(mempool, selectedTxIds, balances) {
  if (!Array.isArray(selectedTxIds) || selectedTxIds.length !== 3) {
    return { ok: false, error: 'INVALID_SELECTION' };
  }
  const ids = selectedTxIds.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id)) || new Set(ids).size !== 3) {
    return { ok: false, error: 'INVALID_SELECTION' };
  }
  const transactions = getTransactionsInSelectionOrder(mempool, ids);
  if (transactions.length !== 3) return { ok: false, error: 'INVALID_SELECTION' };
  if (!isSelectionAffordable(transactions, balances)) {
    return { ok: false, error: 'INSUFFICIENT_BALANCE' };
  }
  const totalFees = transactions.reduce((sum, tx) => sum + tx.fee, 0);
  const maximumFees = getMaximumFeeTotal(mempool, balances);
  if (maximumFees == null) return { ok: false, error: 'NO_PLAYABLE_SELECTION' };
  if (totalFees !== maximumFees) {
    return { ok: false, error: 'FEES_NOT_MAXIMIZED', totalFees };
  }
  return { ok: true, ids, transactions, totalFees };
}

/** Row visual state. Fee optimality is deliberately not revealed in advance. */
export function getTxRowState(txId, mempool, selectedTxIds, balances) {
  if (selectedTxIds.includes(txId)) return 'selected';
  if (selectedTxIds.length >= 3) return 'full';
  const tx = mempool.find((item) => item.id === txId);
  if (!tx || !canAffordTx(tx, mempool, selectedTxIds, balances)) return 'invalid';
  return 'eligible';
}

export function getRejectReasonKey(txId, mempool, selectedTxIds, balances) {
  return getTxRowState(txId, mempool, selectedTxIds, balances) === 'invalid'
    ? 'errTxBalance'
    : 'errTxGeneric';
}

export function canSelectTransaction(txId, mempool, selectedTxIds, balances) {
  return getTxRowState(txId, mempool, selectedTxIds, balances) === 'eligible';
}
