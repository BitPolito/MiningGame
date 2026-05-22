import { getNameValue } from './gameConstants.js';
import { createSeededRandom } from './seededRandom.js';

/** Block value from selected txs (player must compute this manually in Easy mode). */
export function computeBlockValue(txs) {
  let v = 0;
  txs.forEach((tx) => {
    v +=
      getNameValue(tx.sender) +
      getNameValue(tx.receiver) +
      tx.amount +
      tx.fee;
  });
  return v;
}

export function initialEasyTarget() {
  return 550;
}

/** Deterministic next target (multiplayer sync). */
export function nextEasyTarget(prevTarget, blockNum, roomSeed = 'solo') {
  const rng = createSeededRandom(`${roomSeed || 'solo'}-target-${blockNum}`);
  return prevTarget + Math.floor(rng() * 500) + 700;
}
