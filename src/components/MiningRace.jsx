import { useEffect, useRef, useState } from 'react';
import PanelCard from './PanelCard';
import { ICON } from '../assets/icons';
import { getRoomBlocksToWin } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

export default function MiningRace({ roomData, playerName }) {
  const { tr } = useLocale();
  const previousRef = useRef(null);
  const timerRef = useRef(null);
  const [recentPlayer, setRecentPlayer] = useState('');
  const [raceEvent, setRaceEvent] = useState('');

  useEffect(() => {
    const next = new Map((roomData?.players ?? []).map((player) => [player.name, player.blocks]));
    const previous = previousRef.current;
    previousRef.current = next;
    if (!previous) return undefined;
    const advanced = (roomData?.players ?? []).find((player) => player.name !== playerName && player.blocks > (previous.get(player.name) ?? player.blocks));
    if (!advanced) return undefined;
    setRecentPlayer(advanced.name);
    setRaceEvent(tr('opponentMinedBlock', { name: advanced.name, n: advanced.blocks }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setRecentPlayer('');
      setRaceEvent('');
    }, 3500);
    return undefined;
  }, [roomData, playerName, tr]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!roomData?.players?.length) return null;

  const goal = getRoomBlocksToWin(roomData);

  return (
    <PanelCard title={tr('miningRace')} iconSrc={ICON.crown}>
      <span className="bp-sr-only" role="status" aria-live="polite">{raceEvent}</span>
      <div className="bp-race-list">
        {roomData.players.map((p) => {
          const pct = Math.min(100, (p.blocks / goal) * 100);
          const won = p.blocks >= goal;
          const isLeader =
            !won &&
            p.blocks > 0 &&
            p.blocks === Math.max(...roomData.players.map((x) => x.blocks));
          return (
            <div
              key={p.name}
              className={`bp-race-row${isLeader ? ' bp-race-row--leading' : ''}${recentPlayer === p.name ? ' bp-race-row--advanced' : ''}`}
            >
              <span className="bp-race-row__name">
                {p.name}
                {p.name === playerName && (
                  <span style={{ opacity: 0.7, marginLeft: 4 }}>({tr('you')})</span>
                )}
              </span>
              <div className="bp-race-bar">
                <div
                  className={`bp-race-bar__fill${won ? ' bp-race-bar__fill--won' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="bp-race-row__score">
                <strong>{p.blocks}/{goal}</strong>
                <small>{tr('feesScore', { fees: p.feesEarned ?? 0 })}</small>
              </span>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}
