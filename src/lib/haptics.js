export function selectionHaptic(ready = false) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(ready ? [12, 28, 12] : 10);
}

export function miningHaptic(success = false) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(success ? [24, 45, 24, 45, 42] : 8);
}
