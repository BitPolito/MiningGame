import {
  generateTargetHash,
  HARD_POW_CHECK_TARGET,
  isProofOfWorkValid,
  LEADING_ZEROS,
} from './targetHash.js';
import { sha256Hex } from './sha256.js';
import { nonceFromDiceRoll } from './powDice.js';

/**
 * Monte Carlo: dice-style random nonce attempts until valid PoW.
 * @param {object} opts
 * @param {string} [opts.txHash]
 * @param {string} [opts.roomSeed]
 * @param {number} [opts.blockNum]
 * @param {number} [opts.trials]
 * @param {number} [opts.maxAttemptsPerTrial]
 * @param {number} [opts.leadingZeros]
 * @param {boolean} [opts.checkTarget]
 */
export async function simulateDicePow({
  txHash = 'demo-tx-hash-seed',
  roomSeed = 'solo',
  blockNum = 1,
  trials = 2000,
  maxAttemptsPerTrial = 200,
  leadingZeros = LEADING_ZEROS,
  checkTarget = HARD_POW_CHECK_TARGET,
} = {}) {
  const targetHash = generateTargetHash(roomSeed, blockNum);
  const attemptsList = [];
  let timeouts = 0;

  for (let t = 0; t < trials; t++) {
    let found = false;
    for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt++) {
      const { nonce } = nonceFromDiceRoll(attempt);
      const hash = await sha256Hex(txHash + nonce);
      if (isProofOfWorkValid(hash, targetHash, leadingZeros, checkTarget)) {
        attemptsList.push(attempt);
        found = true;
        break;
      }
    }
    if (!found) timeouts += 1;
  }

  attemptsList.sort((a, b) => a - b);
  const n = attemptsList.length;
  const sum = attemptsList.reduce((a, b) => a + b, 0);
  const pct = (p) => (n ? attemptsList[Math.min(n - 1, Math.floor(n * p))] : null);

  return {
    trials,
    successes: n,
    timeouts,
    leadingZeros,
    checkTarget,
    mean: n ? sum / n : null,
    median: pct(0.5),
    p90: pct(0.9),
    p99: pct(0.99),
    min: n ? attemptsList[0] : null,
    max: n ? attemptsList[n - 1] : null,
    successRate: n / trials,
  };
}

/** Compare sequential nonce (+1) vs dice random — expect similar success rate per attempt. */
export async function compareNonceStrategies({
  txHash = 'demo-tx-hash-seed',
  roomSeed = 'solo',
  trials = 500,
  maxAttempts = 120,
  leadingZeros = LEADING_ZEROS,
  checkTarget = HARD_POW_CHECK_TARGET,
} = {}) {
  const targetHash = generateTargetHash(roomSeed, 1);
  let diceWins = 0;
  let seqWins = 0;
  let diceAttempts = 0;
  let seqAttempts = 0;

  for (let t = 0; t < trials; t++) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { nonce: diceNonce } = nonceFromDiceRoll(attempt);
      const diceHash = await sha256Hex(txHash + diceNonce);
      diceAttempts += 1;
      if (isProofOfWorkValid(diceHash, targetHash, leadingZeros, checkTarget)) {
        diceWins += 1;
        break;
      }
    }
    for (let nonce = 1; nonce <= maxAttempts; nonce++) {
      const seqHash = await sha256Hex(txHash + nonce);
      seqAttempts += 1;
      if (isProofOfWorkValid(seqHash, targetHash, leadingZeros, checkTarget)) {
        seqWins += 1;
        break;
      }
    }
  }

  return {
    trials,
    diceWinRate: diceWins / trials,
    seqWinRate: seqWins / trials,
    diceAttemptsPerTrial: diceAttempts / trials,
    seqAttemptsPerTrial: seqAttempts / trials,
  };
}
