import BpIcon from './BpIcon';
import PanelCard from './PanelCard';
import PlayerAvatar from './PlayerAvatar';
import RoomInvite from './RoomInvite';
import RoomCapacitySummary from './RoomCapacitySummary';
import RoomSettingsCard from './RoomSettingsCard';
import { ICON } from '../assets/icons';
import { analyzeRace } from '../lib/raceProjection';
import { getHostDisplayName } from '../lib/roomAuth';
import { getMinerCapacity, getMinerCount } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

function formatLastActive(ts, tr) {
  if (!ts) return tr('hostNeverMined');
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return tr('hostActiveNow');
  if (sec < 3600) return tr('hostActiveMinutes', { n: Math.floor(sec / 60) });
  return tr('hostActiveAgo', { n: Math.floor(sec / 3600) });
}

export default function HostDashboard({
  room,
  roomSeed,
  onStartGame,
  onPlayAgain,
  onShowRules,
  startDisabled,
  showStart,
  showPlayAgain,
  startDisabledReason,
  startLoading = false,
}) {
  const { tr } = useLocale();
  const { leader, likelyWinner, goal, sorted } = analyzeRace(room);
  const hostLabel = getHostDisplayName(room);
  const status = room?.status ?? 'waiting';
  const miners = getMinerCount(room);
  const minerCapacity = getMinerCapacity(room);

  const actions = (showStart || showPlayAgain) ? (
    <div className="bp-host-dash__actions">
      {showStart && (
        <button
          type="button"
          className="bp-btn bp-btn-solid bp-btn--block"
          onClick={onStartGame}
          disabled={startDisabled}
          aria-busy={startLoading}
        >
          {startLoading ? tr('startingGame') : tr('startGame')}
        </button>
      )}
      {showStart && startDisabled && startDisabledReason && (
        <p className="bp-hint bp-hint--center" role="status">{startDisabledReason}</p>
      )}
      {showPlayAgain && (
        <button
          type="button"
          className="bp-btn bp-btn-solid bp-btn--block"
          onClick={onPlayAgain}
        >
          <BpIcon src={ICON.pickaxe} className="bp-icon" tone="on-solid" />
          {tr('playAgain')}
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="bp-host-dash">
      <div className="bp-host-dash__overview">
        <RoomInvite code={roomSeed} compact featured />

        <aside className="bp-host-dash__control">
          <div className="bp-host-dash__hero">
            <BpIcon src={ICON.crown} className="bp-icon--lg" />
            <div>
              <p className="bp-host-dash__label">{tr('hostBadge')}</p>
              <p className="bp-host-dash__host-name">{hostLabel}</p>
              <p className="bp-host-dash__status">
                {tr('minersJoined', { current: miners, total: minerCapacity })}
              </p>
            </div>
          </div>

          <RoomCapacitySummary room={room} compact />

          {status === 'playing' && sorted.length > 0 && (
            <div className="bp-host-dash__insights">
              {leader && (
                <p className="bp-host-dash__insight">
                  <strong>{tr('hostLeader')}:</strong> {leader.name} ({leader.blocks}/{goal})
                </p>
              )}
              {likelyWinner && (
                <p className="bp-host-dash__insight bp-host-dash__insight--accent">
                  <strong>{tr('hostLikelyWinner')}:</strong> {likelyWinner.name}
                </p>
              )}
            </div>
          )}

          {status === 'finished' && room?.winner && (
            <p className="bp-host-dash__winner">
              {tr('playerWon', { name: room.winner })}
            </p>
          )}

          <RoomSettingsCard room={room} onShowRules={onShowRules} showCapacity={false} />
          {actions}
        </aside>
      </div>

      {sorted.length > 0 && (
        <PanelCard title={tr('hostLiveRace')} iconSrc={ICON.pickaxe}>
          <ol className="bp-host-race-list">
            {sorted.map((p, i) => {
              const pct = Math.min(100, (p.blocks / goal) * 100);
              const won = p.blocks >= goal || p.name === room?.winner;
              return (
                <li key={p.name} className="bp-host-race-list__row">
                  <span className="bp-host-race-list__rank">{i + 1}</span>
                  <PlayerAvatar name={p.name} size="sm" />
                  <div className="bp-host-race-list__body">
                    <span className="bp-host-race-list__name">{p.name}</span>
                    <div className="bp-race-bar">
                      <div
                        className={`bp-race-bar__fill${won ? ' bp-race-bar__fill--won' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="bp-host-race-list__meta">
                      {p.blocks}/{goal} · {formatLastActive(p.lastMinedAt, tr)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </PanelCard>
      )}
    </div>
  );
}
