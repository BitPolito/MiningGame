/**
 * Deterministic 100-seed, 12-block validation for both game modes.
 */
import { computeBlockValue } from '../src/lib/easyMining.js';
import {
  computeHardBlockHash,
  createInitialGameState,
  validateAndApplyMine,
} from '../src/lib/gameEngine.js';
import { pickGreedySelection } from '../src/lib/playability.js';
import { getTransactionsInSelectionOrder, getValidBlockSelections, isSelectionAffordable } from '../src/lib/txSelection.js';
import { isProofOfWorkValid } from '../src/lib/targetHash.js';

const SEEDS = parseInt(process.env.SEEDS || '100', 10);
const BLOCKS = parseInt(process.env.BLOCKS || '12', 10);

async function proofFor(difficulty, state) {
  const selectedTxIds = pickGreedySelection(state.mempool, state.balances);
  const txs = getTransactionsInSelectionOrder(state.mempool, selectedTxIds);
  if (difficulty === 'easy') {
    return {
      blockIndex: state.blockNum,
      selectedTxIds,
      nonce: state.target - state.prevTarget - computeBlockValue(txs),
    };
  }
  let nonce = 1;
  while (true) {
    const candidate = await computeHardBlockHash({
      transactions: txs,
      previousBlockHash: state.previousBlockHash,
      version: state.blockVersion,
      timestamp: state.blockTimestamp,
      bits: state.bits,
      nonce,
    });
    if (isProofOfWorkValid(candidate.finalHash, state.targetHash)) break;
    nonce += 1;
  }
  return { blockIndex: state.blockNum, selectedTxIds, nonce };
}

const requestedScenario = process.env.SCENARIO || '';
const scenarios = [
  { difficulty: 'easy', powLevel: '2', label: 'easy' },
  { difficulty: 'hard', powLevel: '2', label: 'hard' },
].filter(({ label }) => !requestedScenario || label === requestedScenario);

for (const scenario of scenarios) {
  const { difficulty, powLevel, label } = scenario;
  for (let seedIndex = 0; seedIndex < SEEDS; seedIndex += 1) {
    const seed = `SIM-${seedIndex}`;
    let state = createInitialGameState(difficulty, seed, powLevel);
    for (let block = 1; block <= BLOCKS; block += 1) {
      const valid = getValidBlockSelections(state.mempool, state.balances);
      const maximum = Math.max(...valid.map((item) => item.totalFees));
      if (valid.length < 2 || valid.filter((item) => item.totalFees === maximum).length !== 1) {
        throw new Error(`${difficulty} seed ${seedIndex} block ${block}: mempool quality failed`);
      }
      const naive = [...state.mempool]
        .sort((a, b) => b.fee - a.fee || a.id - b.id)
        .slice(0, 3);
      const naiveFees = naive.reduce((sum, tx) => sum + tx.fee, 0);
      if (isSelectionAffordable(naive, state.balances) && naiveFees === maximum) {
        throw new Error(`${difficulty} seed ${seedIndex} block ${block}: top-three shortcut is optimal`);
      }
      const result = await validateAndApplyMine({
        difficulty,
        roomSeed: seed,
        state,
        proof: await proofFor(difficulty, state),
      });
      if (!result.ok) throw new Error(`${difficulty} seed ${seedIndex} block ${block}: ${result.error}`);
      state = result.state;
    }
    const accounted = Object.values(state.balances).reduce((sum, value) => sum + value, 0)
      + state.feesEarned;
    if (accounted !== 400) throw new Error(`${difficulty} seed ${seedIndex}: ledger ${accounted}`);
  }
  console.log(`${label}: ${SEEDS} seeds x ${BLOCKS} blocks playable; ledger conserved`);
}
