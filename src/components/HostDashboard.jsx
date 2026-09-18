import BpIcon from './BpIcon';
import PanelCard from './PanelCard';
import RoomInvite from './RoomInvite';
import RoomCapacitySummary from './RoomCapacitySummary';
import RoomSettingsCard from './RoomSettingsCard';
import { ICON } from '../assets/icons';
import { analyzeRace } from '../lib/raceProjection';
import { getHostDisplayName } from '../lib/roomAuth';
import { getMinerCapacity, getMinerCount } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

function formatLastBlock(ts, tr) {
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
  onShowRules,
  startDisabled,
  showStart,
  startDisabledReason,
  startLoading = false,
}) {
  const { tr } = useLocale();
  const { goal, sorted } = analyzeRace(room);
  const hostLabel = getHostDisplayName(room);
  const status = room?.status ?? 'waiting';
  const miners = getMinerCount(room);
  const minerCapacity = getMinerCapacity(room);

  if (status === 'playing') {
    return (
      <div className="bp-host-dash bp-host-dash--live">
        <div className="bp-host-dash__live-meta" role="group" aria-label={tr('hostLiveRace')}>
          <span className="bp-host-dash__live-meta-item bp-host-dash__live-meta-item--miners">
            <BpIcon src={ICON.miner} className="bp-icon--sm" tone="primary" />
            <strong>{tr('minersJoined', { current: miners, total: minerCapacity })}</strong>
          </span>
          <span className="bp-host-dash__live-meta-item">{tr('difficultyLabel')}: <strong>{tr(room.difficulty === 'hard' ? 'difficultyHard' : 'difficultyEasy')}</strong></span>
          <span className="bp-host-dash__live-meta-item">{tr('blocksToWin')}: <strong>{goal}</strong></span>
        </div>
        <PanelCard className="bp-host-dash__race-panel" title={tr('hostLiveRace')} iconSrc={ICON.miner}>
          <ol className="bp-host-race-list" aria-label={tr('hostLiveRace')}>
            {sorted.map((player, index) => {
              const progress = Math.min(100, (player.blocks / goal) * 100);
              return (
                <li
                  key={player.name}
                  className={'bp-host-race-list__row' + (index === 0 && player.blocks > 0 ? ' bp-host-race-list__row--leading' : '')}
                >
                  <span className="bp-host-race-list__rank">{index + 1}</span>
                  <span className="bp-host-race-list__miner">
                    <BpIcon src={ICON.miner} className="bp-icon--sm" tone="primary" />
                  </span>
                  <div className="bp-host-race-list__body">
                    <div className="bp-host-race-list__identity">
                      <span className="bp-host-race-list__name" title={player.name}>{player.name}</span>
                      <strong className="bp-host-race-list__score">{player.blocks}/{goal}</strong>
                    </div>
                    <div className="bp-race-bar" aria-hidden="true">
                      <div className="bp-race-bar__fill" style={{ width: progress + '%' }} />
                    </div>
                    <span className="bp-host-race-list__meta">{formatLastBlock(player.lastMinedAt, tr)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </PanelCard>
      </div>
    );
  }

  const actions = showStart ? (
    <div className="bp-host-dash__actions">
      <button
        type="button"
        className="bp-btn bp-btn-solid bp-btn--block"
        onClick={onStartGame}
        disabled={startDisabled}
        aria-busy={startLoading}
      >
        {startLoading ? tr('startingGame') : tr('startGame')}
      </button>
      {startDisabled && startDisabledReason && (
        <p className="bp-hint bp-hint--center" role="status">{startDisabledReason}</p>
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

          {actions}
          <RoomSettingsCard room={room} onShowRules={onShowRules} showCapacity={false} />
        </aside>
      </div>

      {sorted.length > 0 && (
        <PanelCard className="bp-host-dash__waiting-miners" title={tr('hostLobbyMiners')} iconSrc={ICON.miner}>
          <ol className="bp-host-race-list" aria-label={tr('hostLobbyMiners')}>
            {sorted.map((player, index) => (
              <li key={player.name} className="bp-host-race-list__row">
                <span className="bp-host-race-list__rank">{index + 1}</span>
                <span className="bp-host-race-list__miner">
                  <BpIcon src={ICON.miner} className="bp-icon--sm" tone="primary" />
                </span>
                <span className="bp-host-race-list__name" title={player.name}>{player.name}</span>
              </li>
            ))}
          </ol>
        </PanelCard>
      )}
    </div>
  );
}
