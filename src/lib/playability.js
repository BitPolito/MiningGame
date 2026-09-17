import { getValidBlockSelections } from './txSelection.js';

/** True if at least one affordable three-transaction block exists. */
export function canCompleteBlockSelection(mempool, balances) {
  return getValidBlockSelections(mempool, balances).length > 0;
}

/** Deterministic maximum-fee selection used by tests and simulations. */
export function pickGreedySelection(mempool, balances) {
  const valid = getValidBlockSelections(mempool, balances);
  valid.sort((a, b) =>
    b.totalFees - a.totalFees ||
    a.ids.join(',').localeCompare(b.ids.join(',')),
  );
  return valid[0]?.ids ?? [];
}
