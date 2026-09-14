import { initialBalances } from './gameConstants.js';
import { computeBlockValue, initialEasyTarget, nextEasyTarget } from './easyMining.js';
import { generateMempool, replenishMempool, stabilizeBalances } from './mempool.js';
import { sha256Hex } from './sha256.js';
import { canSelectTransaction } from './txSelection.js';
import { generateTargetHash, isProofOfWorkValid } from './targetHash.js';

export const GAME_STATE_VERSION = 2;

export function createInitialGameState(difficulty, roomSeed) {
  const balances = initialBalances();
  const hard = difficulty === 'hard';
  return {
    version: GAME_STATE_VERSION,
    blockNum: 1,
    balances,
    balanceHistory: [balances],
    history: [],
    mempool: generateMempool({
      balances,
      blockNum: 1,
      roomSeed,
      requireVariance: !hard,
      txDate: hard ? '-2026/05' : null,
    }),
    ...(hard
      ? { targetHash: generateTargetHash(roomSeed, 1) }
      : { prevTarget: 0, target: initialEasyTarget() }),
  };
}

export function validateSelection(state, selectedTxIds) {
  if (!Array.isArray(selectedTxIds) || selectedTxIds.length !== 3) {
    return { ok: false, error: 'INVALID_SELECTION' };
  }
  const ids = selectedTxIds.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id)) || new Set(ids).size !== 3) {
    return { ok: false, error: 'INVALID_SELECTION' };
  }
  const chosen = [];
  for (const id of ids) {
    if (!canSelectTransaction(id, state.mempool, chosen, state.balances)) {
      return { ok: false, error: 'INVALID_SELECTION' };
    }
    chosen.push(id);
  }
  const transactions = state.mempool.filter((tx) => ids.includes(tx.id));
  return transactions.length === 3
    ? { ok: true, ids, transactions }
    : { ok: false, error: 'INVALID_SELECTION' };
}

export async function validateAndApplyMine({ difficulty, roomSeed, state, proof }) {
  if (!state || state.version !== GAME_STATE_VERSION) {
    return { ok: false, error: 'GAME_STATE_INVALID' };
  }
  const blockIndex = Number(proof?.blockIndex);
  const nonce = Number(proof?.nonce);
  if (!Number.isSafeInteger(blockIndex) || blockIndex !== state.blockNum) {
    return { ok: false, error: 'UNEXPECTED_BLOCK' };
  }
  if (!Number.isSafeInteger(nonce) || nonce <= 0) {
    return { ok: false, error: 'INVALID_PROOF' };
  }

  const selection = validateSelection(state, proof?.selectedTxIds);
  if (!selection.ok) return selection;

  if (difficulty === 'hard') {
    const baseString = selection.transactions
      .map((tx) => `${tx.sender}to${tx.receiver}${tx.amount}${tx.date}`)
      .join('-');
    const txHash = await sha256Hex(baseString);
    const finalHash = await sha256Hex(txHash + nonce);
    if (!isProofOfWorkValid(finalHash, state.targetHash)) {
      return { ok: false, error: 'INVALID_PROOF' };
    }
  } else {
    const blockValue = computeBlockValue(selection.transactions);
    if (state.prevTarget + nonce + blockValue !== state.target) {
      return { ok: false, error: 'INVALID_PROOF' };
    }
  }

  const balances = { ...state.balances };
  selection.transactions.forEach((tx) => {
    balances[tx.sender] -= tx.amount + tx.fee;
    balances[tx.receiver] += tx.amount;
  });
  const nextBalances = stabilizeBalances(balances);
  const nextBlockNum = state.blockNum + 1;
  const hard = difficulty === 'hard';
  const nextMempool = hard
    ? replenishMempool(
        state.mempool.filter((tx) => !selection.ids.includes(tx.id)),
        nextBalances,
        nextBlockNum,
        roomSeed,
      )
    : generateMempool({ balances: nextBalances, blockNum: nextBlockNum, roomSeed });

  return {
    ok: true,
    state: {
      version: GAME_STATE_VERSION,
      blockNum: nextBlockNum,
      balances: nextBalances,
      balanceHistory: [...(state.balanceHistory || [state.balances]), nextBalances],
      history: [...(state.history || []), { index: blockIndex, nonce, transactions: selection.transactions }],
      mempool: nextMempool,
      ...(hard
        ? { targetHash: generateTargetHash(roomSeed, nextBlockNum) }
        : { prevTarget: state.target, target: nextEasyTarget(state.target, nextBlockNum, roomSeed) }),
    },
    block: {
      index: blockIndex,
      nonce,
      transactionIds: selection.ids,
    },
  };
}
