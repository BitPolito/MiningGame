import { useEffect, useState } from 'react';

/**
 * Poll room status. Interval adapts: faster in lobby, slower in game.
 * @param {string} roomSeed
 * @param {boolean} enabled
 * @param {'lobby' | 'game'} mode
 */
export function useRoomPoll(roomSeed, enabled = true, mode = 'game') {
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (!roomSeed || !enabled) return;

    let cancelled = false;
    const intervalMs = mode === 'lobby' ? 1000 : 2000;

    const poll = async () => {
      if (document.hidden && mode === 'game') return;
      try {
        const res = await fetch(`/api/room?action=status&seed=${encodeURIComponent(roomSeed)}`);
        const data = await res.json();
        if (!cancelled && data.success) setRoomData(data.room);
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const interval = setInterval(poll, intervalMs);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomSeed, enabled, mode]);

  return [roomData, setRoomData];
}
