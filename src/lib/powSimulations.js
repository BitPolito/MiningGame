import { generateTargetHash, isProofOfWorkValid } from './targetHash.js';
import { hash256Trace } from './sha256.js';
import { nonceFromDiceRoll } from './powDice.js';

/** Monte Carlo for the probability represented by a deterministic block target. */
export async function simulateDicePow({
  txHash = 'demo-block-header-seed',
  roomSeed = 'solo',
  blockNum = 1,
  powLevel = '2',
  trials = 2000,
  maxAttemptsPerTrial = 500,
  rng = Math.random,
} = {}) {
  const targetHash = generateTargetHash(roomSeed, blockNum, powLevel);
  const attemptsList = [];
  let timeouts = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    let found = false;
    for (let attempt = 1; attempt <= maxAttemptsPerTrial; attempt += 1) {
      const { nonce } = nonceFromDiceRoll(attempt, rng);
      const hash = (await hash256Trace(`${txHash}:${trial}:${nonce}`)).displayHash;
      if (isProofOfWorkValid(hash, targetHash)) {
        attemptsList.push(attempt);
        found = true;
        break;
      }
    }
    if (!found) timeouts += 1;
  }

  attemptsList.sort((a, b) => a - b);
  const count = attemptsList.length;
  const sum = attemptsList.reduce((total, value) => total + value, 0);
  const percentile = (fraction) => count
    ? attemptsList[Math.min(count - 1, Math.floor(count * fraction))]
    : null;

  return {
    targetHash,
    powLevel,
    trials,
    successes: count,
    timeouts,
    mean: count ? sum / count : null,
    median: percentile(0.5),
    p90: percentile(0.9),
    p99: percentile(0.99),
    min: count ? attemptsList[0] : null,
    max: count ? attemptsList[count - 1] : null,
    successRate: count / trials,
  };
}

/** Compare random dice nonces and sequential nonces under the same target. */
export async function compareNonceStrategies({
  txHash = 'demo-block-header-seed',
  roomSeed = 'solo',
  powLevel = '2',
  trials = 500,
  maxAttempts = 250,
  rng = Math.random,
} = {}) {
  const targetHash = generateTargetHash(roomSeed, 1, powLevel);
  let diceWins = 0;
  let sequentialWins = 0;
  let diceAttempts = 0;
  let sequentialAttempts = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { nonce } = nonceFromDiceRoll(attempt, rng);
      diceAttempts += 1;
      if (isProofOfWorkValid((await hash256Trace(`${txHash}:dice:${trial}:${nonce}`)).displayHash, targetHash)) {
        diceWins += 1;
        break;
      }
    }
    for (let nonce = 1; nonce <= maxAttempts; nonce += 1) {
      sequentialAttempts += 1;
      if (isProofOfWorkValid((await hash256Trace(`${txHash}:sequential:${trial}:${nonce}`)).displayHash, targetHash)) {
        sequentialWins += 1;
        break;
      }
    }
  }

  return {
    trials,
    diceWinRate: diceWins / trials,
    seqWinRate: sequentialWins / trials,
    diceAttemptsPerTrial: diceAttempts / trials,
    seqAttemptsPerTrial: sequentialAttempts / trials,
  };
}
