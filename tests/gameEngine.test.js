import { describe, expect, it } from 'vitest';
import { computeBlockValue } from '../src/lib/easyMining.js';
import { createInitialGameState, validateAndApplyMine, validateSelection } from '../src/lib/gameEngine.js';
import { pickGreedySelection } from '../src/lib/playability.js';
import { sha256Hex } from '../src/lib/sha256.js';
import { isProofOfWorkValid } from '../src/lib/targetHash.js';

function easyProof(state) {
  const selectedTxIds = pickGreedySelection(state.mempool, state.balances);
  const txs = state.mempool.filter((tx) => selectedTxIds.includes(tx.id));
  return {
    blockIndex: state.blockNum,
    selectedTxIds,
    nonce: state.target - state.prevTarget - computeBlockValue(txs),
  };
}

describe('authoritative game engine', () => {
  it('is deterministic and advances a valid easy block', async () => {
    const a = createInitialGameState('easy', 'TEST-SEED-0001');
    const b = createInitialGameState('easy', 'TEST-SEED-0001');
    expect(a).toEqual(b);
    const result = await validateAndApplyMine({ difficulty: 'easy', roomSeed: 'TEST-SEED-0001', state: a, proof: easyProof(a) });
    expect(result.ok).toBe(true);
    expect(result.state.blockNum).toBe(2);
    expect(result.state.history).toHaveLength(1);
  });

  it('rejects invalid selections, proofs and replayed indices', async () => {
    const state = createInitialGameState('easy', 'TEST-SEED-0002');
    expect(validateSelection(state, [1, 1, 1]).error).toBe('INVALID_SELECTION');
    const proof = easyProof(state);
    expect((await validateAndApplyMine({ difficulty: 'easy', roomSeed: 'TEST-SEED-0002', state, proof: { ...proof, nonce: proof.nonce + 1 } })).error).toBe('INVALID_PROOF');
    expect((await validateAndApplyMine({ difficulty: 'easy', roomSeed: 'TEST-SEED-0002', state, proof: { ...proof, blockIndex: 2 } })).error).toBe('UNEXPECTED_BLOCK');
  });

  it('validates a real hard-mode SHA-256 proof', async () => {
    const seed = 'TEST-SEED-0003';
    const state = createInitialGameState('hard', seed);
    const selectedTxIds = pickGreedySelection(state.mempool, state.balances);
    const txs = state.mempool.filter((tx) => selectedTxIds.includes(tx.id));
    const base = txs.map((tx) => `${tx.sender}to${tx.receiver}${tx.amount}${tx.date}`).join('-');
    const txHash = await sha256Hex(base);
    let nonce = 1;
    while (!isProofOfWorkValid(await sha256Hex(txHash + nonce), state.targetHash)) nonce += 1;
    const result = await validateAndApplyMine({ difficulty: 'hard', roomSeed: seed, state, proof: { blockIndex: 1, selectedTxIds, nonce } });
    expect(result.ok).toBe(true);
    expect(result.state.blockNum).toBe(2);
  });
});
