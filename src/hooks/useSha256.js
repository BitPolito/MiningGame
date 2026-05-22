import { useEffect, useState } from 'react';
import { sha256Hex } from '../lib/sha256';

/** Async SHA-256 hex for `input`; empty string when input is falsy. */
export function useSha256(input) {
  const [hash, setHash] = useState('');

  useEffect(() => {
    if (!input) {
      setHash('');
      return;
    }
    let cancelled = false;
    sha256Hex(input).then((h) => {
      if (!cancelled) setHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return hash;
}
