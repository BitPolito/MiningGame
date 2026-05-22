import { useEffect, useState } from 'react';
import { pickNewerRoom } from '../lib/roomConfig';

/**
 * Poll room status. Interval adapts: faster in lobby, slower in game.
 * @param {string} roomSeed
 * @param {boolean} enabled
 * @param {'lobby' | 'game'} mode
 * @param {object | null} [syncRoom] Optional room from parent poll (merged by updatedAt).
 */
export function useRoomPoll(roomSeed, enabled = true, mode = 'game', syncRoom = null) {
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (!syncRoom) return;
    setRoomData((prev) => pickNewerRoom(prev, syncRoom));
  }, [syncRoom]);

  useEffect(() => {
    if (!roomSeed || !enabled) return;

    let cancelled = false;
    const intervalMs = mode === 'lobby' ? 1000 : 1000;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/room?action=status&seed=${encodeURIComponent(roomSeed)}`,
          { cache: 'no-store' },
        );
        const data = await res.json();
        if (!cancelled && data.success) {
          setRoomData((prev) => pickNewerRoom(prev, data.room));
        }
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
