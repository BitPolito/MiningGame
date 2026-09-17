import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearGameDraft,
  gameDraftContext,
  loadGameDraft,
  saveGameDraft,
} from '../src/lib/gameDraft.js';
import { createInitialGameState } from '../src/lib/gameEngine.js';
import { pickGreedySelection } from '../src/lib/playability.js';

function storageMock() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: storageMock(),
  });
});

describe('game draft persistence', () => {
  it('restores a compatible ordered draft and solo game state', () => {
    const context = gameDraftContext({ difficulty: 'easy', soloSessionId: 'solo-1' });
    const state = createInitialGameState('easy', 'solo-1');
    const selectedTxIds = pickGreedySelection(state.mempool, state.balances).slice(0, 2);
    saveGameDraft(context, state, { selectedTxIds, nonceInput: '123' });
    const restored = loadGameDraft(context);
    expect(restored.gameState).toEqual(state);
    expect(restored.draft.selectedTxIds).toEqual(selectedTxIds);
    expect(restored.draft.nonceInput).toBe('123');
  });

  it('rejects stale or corrupted drafts and supports explicit clearing', () => {
    const context = gameDraftContext({ difficulty: 'hard', roomSeed: 'TEST-ROOM-0001', playerName: 'Alice' });
    const state = createInitialGameState('hard', 'TEST-ROOM-0001');
    saveGameDraft(context, state, { selectedTxIds: [999999], rollCount: 4 });
    expect(loadGameDraft(context, state)).toBeNull();

    saveGameDraft(context, state, { selectedTxIds: [], rollCount: 0 });
    const newer = { ...state, blockNum: state.blockNum + 1 };
    expect(loadGameDraft(context, newer)).toBeNull();

    saveGameDraft(context, state, { selectedTxIds: [], rollCount: 0 });
    clearGameDraft(context);
    expect(loadGameDraft(context, state)).toBeNull();
  });
});
