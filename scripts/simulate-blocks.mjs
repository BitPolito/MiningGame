/**
 * Simulates mining many blocks to verify mempool always allows 3 valid picks.
 * Run: node scripts/simulate-blocks.mjs
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

function applyTxs(mempool, sel, balances) {
  mempool
    .filter((t) => sel.includes(t.id))
    .forEach((tx) => {
      balances[tx.sender] -= tx.amount + tx.fee;
      balances[tx.receiver] += tx.amount;
    });
}

const BLOCKS = parseInt(process.env.BLOCKS || '120', 10);
const seed = 'solo';

console.log('=== Easy-style mempool ===');
let balances = initialBalances();
let easyFails = 0;
for (let block = 1; block <= BLOCKS; block++) {
  const mp = generateMempool({ balances, blockNum: block, roomSeed: seed });
  if (!canCompleteBlockSelection(mp, balances)) {
    console.log('NO valid triple at block', block, 'balances', { ...balances });
    easyFails++;
    break;
  }
  const sel = pickGreedySelection(mp, balances);
  if (sel.length < 3) {
    console.log('greedy stuck block', block);
    easyFails++;
    break;
  }
  applyTxs(mp, sel, balances);
  balances = stabilizeBalances(balances);
}
console.log(easyFails ? `FAILED (${easyFails})` : `OK ${BLOCKS} blocks`);

console.log('\n=== Hard replenish ===');
balances = initialBalances();
let mp = generateMempool({
  balances,
  blockNum: 1,
  roomSeed: seed,
  requireVariance: false,
  txDate: '-2026/05',
});
let hardFails = 0;
for (let block = 1; block <= BLOCKS; block++) {
  if (!canCompleteBlockSelection(mp, balances)) {
    console.log('NO valid triple at block', block);
    hardFails++;
    break;
  }
  const sel = pickGreedySelection(mp, balances);
  if (sel.length < 3) {
    console.log('greedy stuck block', block);
    hardFails++;
    break;
  }
  applyTxs(mp, sel, balances);
  balances = stabilizeBalances(balances);
  mp = replenishMempool(
    mp.filter((t) => !sel.includes(t.id)),
    balances,
    block + 1,
    seed,
  );
}
console.log(hardFails ? `FAILED` : `OK ${BLOCKS} blocks`);
