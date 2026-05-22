export const USERS = ['Alice', 'Bob', 'Carol', 'Dave'];
export const INITIAL_BALANCE = 100;
export { DEFAULT_BLOCKS_TO_WIN as BLOCK_GOAL } from './roomConfig.js';
export const TX_PER_BLOCK = 3;

export function initialBalances() {
  return USERS.reduce((acc, user) => ({ ...acc, [user]: INITIAL_BALANCE }), {});
}

export function getNameValue(name) {
  let val = 0;
  for (let i = 0; i < name.length; i++) {
    val += name.toUpperCase().charCodeAt(i) - 64;
  }
  return val;
}
