import { initialBalances } from './gameConstants.js';
import { computeBlockValue, initialEasyTarget, nextEasyTarget } from './easyMining.js';
import { generateMempool, replenishMempool } from './mempool.js';
import {
  bytesToHex,
  concatBytes,
  hash256Bytes,
  hash256Hex,
  hash256Trace,
  hexToBytes,
  reverseBytes,
} from './sha256.js';
import { evaluateBlockSelection } from './txSelection.js';
import {
  compactToTargetHash,
  createPowSchedule,
  isValidPowSchedule,
  isProofOfWorkValid,
  normalizePowLevel,
} from './targetHash.js';

export const GAME_STATE_VERSION = 7;
export const GENESIS_BLOCK_HASH = '0'.repeat(64);
export const DEFAULT_BLOCK_VERSION = 0x20000000;
export const MAX_BLOCK_NONCE = 0xffffffff;

export function serializeHardTransactions(transactions) {
  return JSON.stringify(
    transactions.map(({ sender, receiver, amount, fee, date }) => [
      sender,
      receiver,
      amount,
      fee,
      date ?? '',
    ]),
  );
}

export async function doubleSha256Hex(value) {
  return hash256Hex(value);
}

async function transactionHashBytes(transaction) {
  return hash256Bytes(new TextEncoder().encode(serializeHardTransactions([transaction])));
}

export async function computeMerkleRoot(transactions) {
  if (!transactions.length) return GENESIS_BLOCK_HASH;
  let layer = await Promise.all(transactions.map(transactionHashBytes));
  while (layer.length > 1) {
    if (layer.length % 2 === 1) layer = [...layer, layer[layer.length - 1]];
    const next = [];
    for (let index = 0; index < layer.length; index += 2) {
      next.push(await hash256Bytes(concatBytes(layer[index], layer[index + 1])));
    }
    layer = next;
  }
  return bytesToHex(reverseBytes(layer[0]));
}

function writeUint32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, Number(value) >>> 0, true);
}

export function serializeHardHeaderBytes({
  version = DEFAULT_BLOCK_VERSION,
  previousBlockHash,
  merkleRoot,
  timestamp,
  bits,
  nonce,
}) {
  if (![previousBlockHash, merkleRoot].every((hash) => /^[0-9a-f]{64}$/i.test(hash ?? ''))) {
    throw new TypeError('Block header hashes must be 32-byte hexadecimal values');
  }
  if (![version, timestamp, bits, nonce].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= MAX_BLOCK_NONCE)) {
    throw new RangeError('Block header integer fields must be uint32 values');
  }
  const header = new Uint8Array(80);
  writeUint32LE(header, 0, version);
  header.set(reverseBytes(hexToBytes(previousBlockHash)), 4);
  header.set(reverseBytes(hexToBytes(merkleRoot)), 36);
  writeUint32LE(header, 68, timestamp);
  writeUint32LE(header, 72, bits);
  writeUint32LE(header, 76, nonce);
  return header;
}

export function serializeHardHeader(fields) {
  return bytesToHex(serializeHardHeaderBytes(fields));
}

export async function computeHardBlockHash({
  transactions,
  previousBlockHash,
  version = DEFAULT_BLOCK_VERSION,
  timestamp,
  bits,
  nonce,
}) {
  const merkleRoot = await computeMerkleRoot(transactions);
  const headerBytes = serializeHardHeaderBytes({
    version,
    previousBlockHash,
    merkleRoot,
    timestamp,
    bits,
    nonce,
  });
  const trace = await hash256Trace(headerBytes);
  return {
    merkleRoot,
    header: bytesToHex(headerBytes),
    firstHash: trace.firstHash,
    secondHash: trace.secondHash,
    finalHash: trace.displayHash,
  };
}

function initialTimestamp(roomSeed) {
  let hash = 2166136261;
  for (const char of String(roomSeed || 'solo')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 1700000000 + ((hash >>> 0) % 31536000);
}

export function createInitialGameState(difficulty, roomSeed, powLevel = '2', powSchedule = null, powRound = 0) {
  const balances = initialBalances();
  const hard = difficulty === 'hard';
  const normalizedLevel = normalizePowLevel(powLevel);
  const schedule = hard ? (powSchedule ?? createPowSchedule()) : null;
  if (hard && !isValidPowSchedule(schedule)) throw new TypeError('Invalid PoW schedule');
  const bits = hard ? schedule[0] : null;
  return {
    version: GAME_STATE_VERSION,
    blockNum: 1,
    balances,
    balanceHistory: [balances],
    history: [],
    feesEarned: 0,
    mempool: generateMempool({ balances, blockNum: 1, roomSeed }),
    ...(hard
      ? {
          powLevel: normalizedLevel,
          powSchedule: schedule,
          powRound,
          blockVersion: DEFAULT_BLOCK_VERSION,
          blockTimestamp: initialTimestamp(roomSeed),
          bits,
          previousBlockHash: GENESIS_BLOCK_HASH,
          targetHash: compactToTargetHash(bits),
        }
      : { prevTarget: 0, target: initialEasyTarget() }),
  };
}

export function validateSelection(state, selectedTxIds) {
  return evaluateBlockSelection(state?.mempool ?? [], selectedTxIds, state?.balances ?? {});
}

export async function validateAndApplyMine({ difficulty, roomSeed, state, proof }) {
  if (!state || state.version !== GAME_STATE_VERSION) return { ok: false, error: 'GAME_STATE_INVALID' };
  const blockIndex = Number(proof?.blockIndex);
  const nonce = Number(proof?.nonce);
  if (!Number.isSafeInteger(blockIndex) || blockIndex !== state.blockNum) {
    return { ok: false, error: 'UNEXPECTED_BLOCK' };
  }
  const nonceInvalid = !Number.isSafeInteger(nonce)
    || (difficulty === 'hard' ? nonce < 0 || nonce > MAX_BLOCK_NONCE : nonce <= 0);
  if (nonceInvalid) return { ok: false, error: 'INVALID_PROOF' };

  const selection = validateSelection(state, proof?.selectedTxIds);
  if (!selection.ok) return selection;

  let hardProof = null;
  if (difficulty === 'hard') {
    if (!isValidPowSchedule(state.powSchedule)
      || state.blockNum >= state.powSchedule.length
      || state.bits !== state.powSchedule[state.blockNum - 1]
      || state.targetHash !== compactToTargetHash(state.bits)) {
      return { ok: false, error: 'GAME_STATE_INVALID' };
    }
    hardProof = await computeHardBlockHash({
      transactions: selection.transactions,
      previousBlockHash: state.previousBlockHash,
      version: state.blockVersion,
      timestamp: state.blockTimestamp,
      bits: state.bits,
      nonce,
    });
    const expectedTarget = compactToTargetHash(state.bits);
    if (state.targetHash !== expectedTarget || !isProofOfWorkValid(hardProof.finalHash, expectedTarget)) {
      return { ok: false, error: 'INVALID_PROOF' };
    }
  } else {
    const blockValue = computeBlockValue(selection.transactions);
    if (state.prevTarget + nonce + blockValue !== state.target) return { ok: false, error: 'INVALID_PROOF' };
  }

  const balances = { ...state.balances };
  selection.transactions.forEach((tx) => {
    balances[tx.sender] -= tx.amount + tx.fee;
    balances[tx.receiver] += tx.amount;
  });
  const nextBlockNum = state.blockNum + 1;
  const remaining = state.mempool.filter((tx) => !selection.ids.includes(tx.id));
  const nextMempool = replenishMempool(remaining, balances, nextBlockNum, roomSeed);
  const feesEarned = (state.feesEarned ?? 0) + selection.totalFees;
  const block = {
    index: blockIndex,
    nonce,
    transactionIds: selection.ids,
    transactions: selection.transactions,
    totalFees: selection.totalFees,
    ...(difficulty === 'easy' ? {
      prevTarget: state.prevTarget,
      target: state.target,
      blockValue: computeBlockValue(selection.transactions),
    } : {}),
    ...(hardProof ? {
      version: state.blockVersion,
      timestamp: state.blockTimestamp,
      bits: state.bits,
      previousBlockHash: state.previousBlockHash,
      merkleRoot: hardProof.merkleRoot,
      header: hardProof.header,
      firstHash: hardProof.firstHash,
      secondHash: hardProof.secondHash,
      targetHash: state.targetHash,
      blockHash: hardProof.finalHash,
    } : {}),
  };

  return {
    ok: true,
    state: {
      version: GAME_STATE_VERSION,
      blockNum: nextBlockNum,
      balances,
      balanceHistory: [...(state.balanceHistory || [state.balances]), balances],
      history: [...(state.history || []), block],
      feesEarned,
      mempool: nextMempool,
      ...(difficulty === 'hard'
        ? {
            powLevel: state.powLevel,
            blockVersion: state.blockVersion,
            powRound: state.powRound,
            blockTimestamp: state.blockTimestamp + 600,
            powSchedule: state.powSchedule,
            bits: state.powSchedule[nextBlockNum - 1],
            previousBlockHash: hardProof.finalHash,
            targetHash: compactToTargetHash(state.powSchedule[nextBlockNum - 1]),
          }
        : { prevTarget: state.target, target: nextEasyTarget(state.target, nextBlockNum, roomSeed) }),
    },
    block,
  };
}
