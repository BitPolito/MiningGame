import { createSeededRandom } from '../src/lib/seededRandom.js';
import { simulateDicePow, compareNonceStrategies } from '../src/lib/powSimulations.js';
import { getTargetPacing } from '../src/lib/targetHash.js';

const trials = parseInt(process.env.POW_TRIALS || '1200', 10);

const stats = await simulateDicePow({
  trials,
  rng: createSeededRandom('pow-balanced'),
});
const estimate = getTargetPacing(stats.targetHash);
console.log();
console.log('=== Fixed balanced nBits target ===');
console.log(`target=${stats.targetHash.slice(0, 8)}…${stats.targetHash.slice(-4)}, trials=${trials}`);
console.log({ estimate, observed: stats });

console.log();
console.log('=== Dice vs sequential nonce ===');
console.log(await compareNonceStrategies({
  trials: 400,
  rng: createSeededRandom('pow-strategies'),
}));
