/**
 * PoW playability — dice rolls vs sequential nonce, mempool + mining sessions.
 * Run: npm run simulate:pow
 */
import {
  generateMempool,
  replenishMempool,
  stabilizeBalances,
} from '../src/lib/mempool.js';
import { initialBalances } from '../src/lib/gameConstants.js';
import {
  canCompleteBlockSelection,
  pickGreedySelection,
} from '../src/lib/playability.js';
import { simulateDicePow, compareNonceStrategies } from '../src/lib/powSimulations.js';
import { HARD_POW_CHECK_TARGET, LEADING_ZEROS } from '../src/lib/targetHash.js';

const BLOCKS = parseInt(process.env.BLOCKS || '80', 10);
const POW_TRIALS = parseInt(process.env.POW_TRIALS || '1500', 10);

function applyTxs(mempool, sel, balances) {
  mempool
    .filter((t) => sel.includes(t.id))
    .forEach((tx) => {
      balances[tx.sender] -= tx.amount + tx.fee;
      balances[tx.receiver] += tx.amount;
    });
}

console.log('=== Dice PoW (random nonce per roll) ===');
console.log(`leadingZeros=${LEADING_ZEROS}, checkTarget=${HARD_POW_CHECK_TARGET}, trials=${POW_TRIALS}`);
const diceStats = await simulateDicePow({
  trials: POW_TRIALS,
  leadingZeros: LEADING_ZEROS,
});
console.log(diceStats);

const fullPow = await simulateDicePow({
  trials: 800,
  leadingZeros: LEADING_ZEROS,
  checkTarget: true,
});
console.log('\n(Reference: prefix + target compare, median ~', fullPow.median, 'rolls)');
console.log(
  `Typical session: ~${Math.round(diceStats.median)} rolls to win (median), ` +
    `90% within ${diceStats.p90} rolls.`,
);

console.log('\n=== Dice vs sequential nonce (win rate) ===');
const cmp = await compareNonceStrategies({ trials: 400 });
console.log(cmp);

console.log('\n=== Full hard session (mempool + greedy picks per block) ===');
let balances = initialBalances();
let mp = generateMempool({
  balances,
  blockNum: 1,
  roomSeed: 'solo',
  requireVariance: false,
  txDate: '-2026/05',
});
let fails = 0;
for (let block = 1; block <= BLOCKS; block++) {
  if (!canCompleteBlockSelection(mp, balances)) {
    console.log('NO valid triple at block', block);
    fails++;
    break;
  }
  const sel = pickGreedySelection(mp, balances);
  if (sel.length < 3) {
    console.log('greedy stuck block', block);
    fails++;
    break;
  }
  applyTxs(mp, sel, balances);
  balances = stabilizeBalances(balances);
  mp = replenishMempool(
    mp.filter((t) => !sel.includes(t.id)),
    balances,
    block + 1,
    'solo',
  );
}
console.log(fails ? `Mempool FAILED` : `Mempool OK for ${BLOCKS} blocks`);
console.log(
  `Estimated PoW clicks for ${BLOCKS} blocks: ~${Math.round(diceStats.median * BLOCKS)} dice rolls (median).`,
);
