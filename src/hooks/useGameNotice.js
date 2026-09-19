import { useCallback, useState } from 'react';

export function useGameNotice(initialKey = null) {
  const [notice, setNotice] = useState(() => ({ key: typeof initialKey === 'function' ? initialKey() : initialKey, id: 0 }));
  const setMessageKey = useCallback((nextKey) => {
    setNotice((current) => ({
      key: typeof nextKey === 'function' ? nextKey(current.key) : nextKey,
      id: current.id + 1,
    }));
  }, []);
  return [notice.key, setMessageKey, notice.id];
}
