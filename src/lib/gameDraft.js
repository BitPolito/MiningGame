import { canAffordTx } from './txSelection.js';

const DRAFT_VERSION = 3;
const PREFIX = 'bp-game-draft-v4:';
const LEGACY_PREFIXES = ['bp-game-draft-v3:', 'bp-game-draft-v2:', 'bp-game-draft-v1:'];
const SOLO_META_KEY = 'bp-solo-session-v3';
const LEGACY_SOLO_META_KEYS = ['bp-solo-session-v2', 'bp-solo-session-v1'];

function safeSessionStorage() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

export function gameStateFingerprint(state) {
  if (!state) return '';
  const target = state.targetHash ?? `${state.prevTarget ?? ''}:${state.target ?? ''}`;
  const ids = (state.mempool ?? []).map((tx) => tx.id).join(',');
  return `${state.version}:${state.blockNum}:${state.powLevel ?? ""}:${state.blockVersion ?? ""}:${state.blockTimestamp ?? ""}:${state.bits ?? ""}:${state.previousBlockHash ?? ""}:${target}:${ids}`;
}

export function gameDraftContext({ difficulty, roomSeed, playerName, soloSessionId }) {
  const scope = roomSeed
    ? `room:${String(roomSeed).toUpperCase()}:${String(playerName).trim().toLowerCase()}`
    : `solo:${soloSessionId || 'current'}`;
  return { difficulty: difficulty === 'hard' ? 'hard' : 'easy', scope };
}

function draftKey(context) {
  return `${PREFIX}${context.difficulty}:${context.scope}`;
}

function sanitizeDraft(raw, context, authoritativeState) {
  if (!raw || raw.version !== DRAFT_VERSION || raw.difficulty !== context.difficulty) return null;
  const gameState = authoritativeState ?? raw.gameState;
  if (!gameState || raw.fingerprint !== gameStateFingerprint(gameState)) return null;
  const selectedTxIds = Array.isArray(raw.draft?.selectedTxIds)
    ? raw.draft.selectedTxIds.map(Number)
    : [];
  if (selectedTxIds.length > 3 || new Set(selectedTxIds).size !== selectedTxIds.length) return null;
  const selected = [];
  for (const id of selectedTxIds) {
    const tx = gameState.mempool.find((item) => item.id === id);
    if (!tx || !canAffordTx(tx, gameState.mempool, selected, gameState.balances)) return null;
    selected.push(id);
  }
  return {
    gameState,
    draft: {
      selectedTxIds,
      nonceInput: String(raw.draft?.nonceInput ?? '').slice(0, 32),
      nonce: Number.isSafeInteger(raw.draft?.nonce) && raw.draft.nonce >= 0 && raw.draft.nonce <= 0xffffffff ? raw.draft.nonce : 0,
      finalHash: /^[0-9a-f]{64}$/i.test(raw.draft?.finalHash ?? '') ? raw.draft.finalHash.toLowerCase() : '',
      miningDone: Boolean(raw.draft?.miningDone),
      hasAcknowledgedPow: Boolean(raw.draft?.hasAcknowledgedPow),
      diceFaces: Array.isArray(raw.draft?.diceFaces) && raw.draft.diceFaces.length === 2
        ? raw.draft.diceFaces.map((face) => Number.isInteger(face) && face >= 1 && face <= 6 ? face : null)
        : [null, null],
      rollCount: Number.isSafeInteger(raw.draft?.rollCount) && raw.draft.rollCount >= 0
        ? raw.draft.rollCount
        : 0,
    },
  };
}

export function loadGameDraft(context, authoritativeState = null) {
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    const raw = JSON.parse(storage.getItem(draftKey(context)) || 'null');
    const clean = sanitizeDraft(raw, context, authoritativeState);
    if (!clean && raw) storage.removeItem(draftKey(context));
    return clean;
  } catch {
    storage.removeItem(draftKey(context));
    return null;
  }
}

export function saveGameDraft(context, gameState, draft) {
  const storage = safeSessionStorage();
  if (!storage || !gameState) return;
  storage.setItem(draftKey(context), JSON.stringify({
    version: DRAFT_VERSION,
    difficulty: context.difficulty,
    fingerprint: gameStateFingerprint(gameState),
    gameState: context.scope.startsWith('solo:') ? gameState : undefined,
    draft,
  }));
}

export function clearGameDraft(context) {
  const storage = safeSessionStorage();
  storage?.removeItem(draftKey(context));
  LEGACY_PREFIXES.forEach((prefix) => storage?.removeItem(`${prefix}${context.difficulty}:${context.scope}`));
}

export function loadSoloSessionMeta() {
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    const data = JSON.parse(storage.getItem(SOLO_META_KEY) || 'null');
    return data?.id && ['easy', 'hard'].includes(data.difficulty) ? data : null;
  } catch {
    storage.removeItem(SOLO_META_KEY);
    return null;
  }
}

export function saveSoloSessionMeta(meta) {
  const storage = safeSessionStorage();
  LEGACY_SOLO_META_KEYS.forEach((key) => storage?.removeItem(key));
  storage?.setItem(SOLO_META_KEY, JSON.stringify(meta));
}

export function clearSoloSessionMeta() {
  const storage = safeSessionStorage();
  storage?.removeItem(SOLO_META_KEY);
  LEGACY_SOLO_META_KEYS.forEach((key) => storage?.removeItem(key));
}
