import { describe, expect, it } from 'vitest';
import { computeBlockValue } from '../src/lib/easyMining.js';
import {
  computeHardBlockHash,
  createInitialGameState,
  serializeHardHeaderBytes,
  serializeHardTransactions,
  validateAndApplyMine,
  validateSelection,
} from '../src/lib/gameEngine.js';
import { pickGreedySelection } from '../src/lib/playability.js';
import {
  evaluateBlockSelection,
  getAvailableBalances,
  getMaximumFeeTotal,
  getValidBlockSelections,
  getTransactionsInSelectionOrder,
} from '../src/lib/txSelection.js';
import { compactToTargetHash, isProofOfWorkValid } from '../src/lib/targetHash.js';
import { hash256Trace, hexToBytes } from '../src/lib/sha256.js';

function easyProof(state, ids = pickGreedySelection(state.mempool, state.balances)) {
  const txs = getTransactionsInSelectionOrder(state.mempool, ids);
  return {
    blockIndex: state.blockNum,
    selectedTxIds: ids,
    nonce: state.target - state.prevTarget - computeBlockValue(txs),
  };
}

async function hardProof(state, ids) {
  const txs = getTransactionsInSelectionOrder(state.mempool, ids);
  let nonce = 1;
  while (true) {
    const proof = await computeHardBlockHash({
      transactions: txs,
      previousBlockHash: state.previousBlockHash,
      version: state.blockVersion,
      timestamp: state.blockTimestamp,
      bits: state.bits,
      nonce,
    });
    if (isProofOfWorkValid(proof.finalHash, state.targetHash)) break;
    nonce += 1;
  }
  return { blockIndex: state.blockNum, selectedTxIds: ids, nonce };
}

describe('Bitcoin HASH256 compatibility', () => {
  it('serializes exactly 80 bytes and enforces uint32 header fields', () => {
    const fields = {
      version: 0x20000000,
      previousBlockHash: '0'.repeat(64),
      merkleRoot: '1'.repeat(64),
      timestamp: 1700000000,
      bits: 0x20050000,
      nonce: 0,
    };
    expect(serializeHardHeaderBytes(fields)).toHaveLength(80);
    expect(() => serializeHardHeaderBytes({ ...fields, nonce: 0x100000000 })).toThrow(RangeError);
  });

  it('matches the Bitcoin mainnet genesis block header vector', async () => {
    const header = [
      '01000000',
      '0000000000000000000000000000000000000000000000000000000000000000',
      '3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a',
      '29ab5f49',
      'ffff001d',
      '1dac2b7c',
    ].join('');
    expect(header).toHaveLength(160);
    const trace = await hash256Trace(hexToBytes(header));
    expect(trace.displayHash).toBe('000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f');
  });
});

describe('maximum-fee transaction selection', () => {
  const balances = { Alice: 100, Bob: 100, Carol: 100, Dave: 100 };
  const mempool = [
    { id: 1, sender: 'Alice', receiver: 'Bob', amount: 10, fee: 9 },
    { id: 2, sender: 'Bob', receiver: 'Carol', amount: 10, fee: 8 },
    { id: 3, sender: 'Carol', receiver: 'Dave', amount: 10, fee: 7 },
    { id: 4, sender: 'Dave', receiver: 'Alice', amount: 10, fee: 2 },
  ];

  it('accepts only affordable combinations with maximum total fees', () => {
    expect(getMaximumFeeTotal(mempool, balances)).toBe(24);
    expect(evaluateBlockSelection(mempool, [1, 2, 3], balances)).toMatchObject({ ok: true, totalFees: 24 });
    expect(evaluateBlockSelection(mempool, [1, 2, 4], balances).error).toBe('FEES_NOT_MAXIMIZED');
  });

  it('shows spendable balances without treating pending incoming funds as available', () => {
    expect(getAvailableBalances(balances, mempool, [1, 2])).toEqual({
      Alice: 81,
      Bob: 82,
      Carol: 100,
      Dave: 100,
    });
  });

  it('accepts ties and reports cumulative sender balance separately', () => {
    const tied = mempool.map((tx) => ({ ...tx, fee: 5 }));
    expect(evaluateBlockSelection(tied, [1, 2, 3], balances).ok).toBe(true);
    expect(evaluateBlockSelection(tied, [1, 2, 4], balances).ok).toBe(true);
    const poor = { ...balances, Alice: 15 };
    const repeated = [
      { id: 10, sender: 'Alice', receiver: 'Bob', amount: 5, fee: 3 },
      { id: 11, sender: 'Alice', receiver: 'Carol', amount: 5, fee: 3 },
      { id: 12, sender: 'Bob', receiver: 'Dave', amount: 5, fee: 1 },
    ];
    expect(evaluateBlockSelection(repeated, [10, 11, 12], poor).error).toBe('INSUFFICIENT_BALANCE');
  });

  it('generates strategic pools where the three highest fees are not the answer', () => {
    const state = createInitialGameState('easy', 'STRATEGIC-FEES');
    expect(state.mempool).toHaveLength(15);
    const naive = [...state.mempool]
      .sort((a, b) => b.fee - a.fee || a.id - b.id)
      .slice(0, 3);
    expect(evaluateBlockSelection(state.mempool, naive.map((tx) => tx.id), state.balances).ok).toBe(false);
    expect(validateSelection(state, pickGreedySelection(state.mempool, state.balances)).ok).toBe(true);
  });
});

describe('authoritative game engine', () => {
  it('is deterministic, advances Easy and conserves the represented ledger plus miner fees', async () => {
    const a = createInitialGameState('easy', 'TEST-SEED-0001');
    const b = createInitialGameState('easy', 'TEST-SEED-0001');
    expect(a).toEqual(b);
    const result = await validateAndApplyMine({
      difficulty: 'easy',
      roomSeed: 'TEST-SEED-0001',
      state: a,
      proof: easyProof(a),
    });
    expect(result.ok).toBe(true);
    expect(result.state.blockNum).toBe(2);
    expect(result.state.history).toHaveLength(1);
    const accounted = Object.values(result.state.balances).reduce((sum, value) => sum + value, 0)
      + result.state.feesEarned;
    expect(accounted).toBe(400);
  });

  it('keeps 100 twelve-block races playable, varied and strategically non-trivial', async () => {
    for (let seedIndex = 0; seedIndex < 100; seedIndex += 1) {
      const roomSeed = `MEMPOOL-QUALITY-${seedIndex}`;
      let state = createInitialGameState('easy', roomSeed);

      for (let block = 0; block < 12; block += 1) {
        expect(state.mempool).toHaveLength(15);
        const fees = state.mempool.map((tx) => tx.fee);
        const minimumFee = Math.min(...fees);
        expect(minimumFee).toBeGreaterThanOrEqual(2);
        expect(fees.filter((fee) => fee === minimumFee).length).toBeLessThanOrEqual(2);
        expect(new Set(fees).size).toBeGreaterThanOrEqual(7);

        const valid = getValidBlockSelections(state.mempool, state.balances)
          .sort((a, b) => b.totalFees - a.totalFees);
        expect(valid.length).toBeGreaterThanOrEqual(2);
        const maximumFees = valid[0].totalFees;
        expect(valid.filter((selection) => selection.totalFees === maximumFees).length)
          .toBeLessThanOrEqual(3);

        const naive = [...state.mempool]
          .sort((a, b) => b.fee - a.fee || a.id - b.id)
          .slice(0, 3)
          .map((tx) => tx.id);
        expect(evaluateBlockSelection(state.mempool, naive, state.balances).ok).toBe(false);

        const previousIds = new Set(state.mempool.map((tx) => tx.id));
        const result = await validateAndApplyMine({
          difficulty: 'easy',
          roomSeed,
          state,
          proof: easyProof(state, valid[0].ids),
        });
        expect(result.ok).toBe(true);

        const arrivalPositions = result.state.mempool
          .map((tx, index) => previousIds.has(tx.id) ? null : index)
          .filter((index) => index != null);
        if (arrivalPositions.length === 3) {
          expect(arrivalPositions.filter((index) => index < 5)).toHaveLength(1);
          expect(arrivalPositions.filter((index) => index >= 5 && index < 10)).toHaveLength(1);
          expect(arrivalPositions.filter((index) => index >= 10 && index < 14)).toHaveLength(1);
          expect(arrivalPositions).not.toContain(14);
        }

        state = result.state;
      }
    }
  });

  it('rejects malformed selection, wrong proof and replayed block index', async () => {
    const state = createInitialGameState('easy', 'TEST-SEED-0002');
    expect(validateSelection(state, [1, 1, 1]).error).toBe('INVALID_SELECTION');
    const proof = easyProof(state);
    expect((await validateAndApplyMine({
      difficulty: 'easy', roomSeed: 'TEST-SEED-0002', state,
      proof: { ...proof, nonce: proof.nonce + 1 },
    })).error).toBe('INVALID_PROOF');
    expect((await validateAndApplyMine({
      difficulty: 'easy', roomSeed: 'TEST-SEED-0002', state,
      proof: { ...proof, blockIndex: 2 },
    })).error).toBe('UNEXPECTED_BLOCK');
  });

  it('preserves selection order in Hard serialization and validates real SHA-256 proof', async () => {
    const seed = 'TEST-SEED-0003';
    const state = createInitialGameState('hard', seed);
    const schedule = state.powSchedule;
    const peerState = createInitialGameState('hard', seed, '2', schedule);
    expect(peerState.bits).toBe(schedule[0]);
    expect(peerState).toEqual(state);
    expect(peerState.powSchedule).toEqual(schedule);
    expect(peerState.targetHash).toBe(compactToTargetHash(schedule[0]));
    const optimal = pickGreedySelection(state.mempool, state.balances);
    const ids = [...optimal].reverse();
    const ordered = getTransactionsInSelectionOrder(state.mempool, ids);
    const normal = getTransactionsInSelectionOrder(state.mempool, optimal);
    expect(serializeHardTransactions(ordered)).not.toBe(serializeHardTransactions(normal));

    const result = await validateAndApplyMine({
      difficulty: 'hard',
      roomSeed: seed,
      state,
      proof: await hardProof(state, ids),
    });
    expect(result.ok).toBe(true);
    expect(result.block.transactionIds).toEqual(ids);
    expect(result.block.transactions.map((tx) => tx.id)).toEqual(ids);
    expect(result.block.previousBlockHash).toBe(state.previousBlockHash);
    expect(result.block.merkleRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(result.block.blockHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.block.header).toHaveLength(160);
    expect(result.block.firstHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.block.secondHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.state.previousBlockHash).toBe(result.block.blockHash);
    expect(result.state.targetHash).toBe(compactToTargetHash(state.powSchedule[1]));
    expect(result.state.bits).toBe(state.powSchedule[1]);
    expect(result.state.blockTimestamp).toBe(state.blockTimestamp + 600);
    const secondIds = pickGreedySelection(result.state.mempool, result.state.balances);
    const secondResult = await validateAndApplyMine({
      difficulty: 'hard',
      roomSeed: seed,
      state: result.state,
      proof: await hardProof(result.state, secondIds),
    });
    expect(secondResult.ok).toBe(true);
    expect(secondResult.block.bits).toBe(state.powSchedule[1]);
    expect(secondResult.state.bits).toBe(state.powSchedule[2]);
  });
});
