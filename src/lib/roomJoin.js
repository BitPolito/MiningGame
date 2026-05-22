/** Build a shareable URL that opens the join flow with this room code. */
export function buildJoinUrl(seed) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', String(seed).trim().toUpperCase());
  return url.toString();
}

/** Read ?join=CODE or ?room=CODE from the current page URL. */
export function readJoinCodeFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('join') || params.get('room') || '').trim().toUpperCase();
  return code || null;
}

/** Remove join params from the address bar after applying them. */
export function clearJoinParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  url.searchParams.delete('room');
  const next = url.searchParams.toString();
  window.history.replaceState({}, '', next ? `${url.pathname}?${next}` : url.pathname);
}
