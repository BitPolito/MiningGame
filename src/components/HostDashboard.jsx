import BpIcon from './BpIcon';
import PanelCard from './PanelCard';
import PlayerAvatar from './PlayerAvatar';
import RoomInvite from './RoomInvite';
import RoomSettingsCard from './RoomSettingsCard';
import { ICON } from '../assets/icons';
import { analyzeRace } from '../lib/raceProjection';
import { getHostDisplayName } from '../lib/roomAuth';
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
}) {
  const { tr } = useLocale();
  const { leader, likelyWinner, goal, sorted } = analyzeRace(room);
  const hostLabel = getHostDisplayName(room);
  const status = room?.status ?? 'waiting';

  return (
    <div className="bp-host-dash">
      <RoomInvite code={roomSeed} compact />

      <div className="bp-host-dash__hero">
        <BpIcon src={ICON.crown} className="bp-icon--lg" />
        <div>
          <p className="bp-host-dash__label">{tr('hostDashboardTitle')}</p>
          <p className="bp-host-dash__host-name">{hostLabel}</p>
          <p className="bp-host-dash__status">
            {status === 'waiting' && tr('hostDashboardWaiting')}
            {status === 'playing' && tr('hostDashboardPlaying')}
            {status === 'finished' && tr('hostDashboardFinished')}
          </p>
        </div>
      </div>

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

      <PanelCard title={tr('hostLiveRace')} iconSrc={ICON.pickaxe}>
        {!sorted.length ? (
          <p className="bp-hint">{tr('hostNoPlayersYet')}</p>
        ) : (
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
        )}
      </PanelCard>

      <RoomSettingsCard room={room} onShowRules={onShowRules} />

      {(showStart || showPlayAgain) && (
        <div className="bp-host-dash__actions">
          {showStart && (
            <button
              type="button"
              className="bp-btn bp-btn-solid bp-btn--block"
              onClick={onStartGame}
              disabled={startDisabled}
            >
              {tr('startGame')}
            </button>
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
      )}
    </div>
  );
}
