import LangToggle from '../LangToggle';
import AppNavActions from '../AppNavActions';
import SelectionCounter from '../SelectionCounter';
import { useLocale } from '../../i18n/LocaleContext';

/**
 * In-game HUD: navigation, room state and compact live stats.
 */
export default function GameHud({
  onHome,
  onHelp,
  difficulty,
  roomSeed,
  stats = [],
  children,
  syncStatus = 'online',
}) {
  const { tr } = useLocale();
  return (
    <header className="bp-game-hud" aria-label={tr('gameHudAria')}>
      <div className="bp-game-hud__topline">
        <div className="bp-game-hud__nav">
          <div className="bp-game-hud__nav-start">
          <AppNavActions onHome={onHome} onRules={onHelp} compact />
          <span
            className={`bp-game-hud__pill bp-game-hud__pill--difficulty${difficulty === 'hard' ? ' bp-game-hud__pill--hard' : ''}`}
          >
            {tr(difficulty === 'easy' ? 'difficultyEasy' : 'difficultyHard')}
          </span>
          {roomSeed && (
            <>
              <span className="bp-game-hud__pill bp-game-hud__pill--room" title={tr('roomCode')}>
                {roomSeed}
              </span>
              <span
                className={'bp-game-hud__pill bp-game-hud__pill--sync bp-game-hud__pill--sync-' + syncStatus}
                role="status"
                aria-live="polite"
              >
                {tr(syncStatus === 'online' ? 'syncOnline' : syncStatus === 'offline' ? 'syncOffline' : 'syncReconnecting')}
              </span>
            </>
          )}
        </div>
          <div className="bp-game-hud__nav-end">
            <LangToggle />
          </div>
        </div>

        <div className="bp-game-hud__metrics">
        {stats.map((stat, index) => (
          <div
            className={[
              'bp-hud-stat',
              stat.kind === 'selection' ? 'bp-hud-stat--selection' : '',
              stat.ready ? 'bp-hud-stat--ready' : '',
              stat.secondary ? 'bp-hud-stat--secondary' : '',
            ].filter(Boolean).join(' ')}
            key={`${stat.label}-${index}`}
            title={stat.title}
          >
            <span className="bp-hud-stat__label">
              <span className="bp-hud-stat__label-full">{stat.label}</span>
              {stat.shortLabel && <span className="bp-hud-stat__label-short">{stat.shortLabel}</span>}
            </span>
            {stat.kind === 'selection' ? (
              <div className="bp-hud-stat__selection-row">
                <SelectionCounter count={stat.count} variant="hud" />
                {stat.meta && <span className="bp-hud-stat__meta">{stat.meta}</span>}
              </div>
            ) : (
              <span className={`bp-hud-stat__value${stat.mono ? ' bp-hud-stat__value--mono' : ''}`}>
                {stat.value}
              </span>
            )}
          </div>
        ))}
        </div>
      </div>
      {children}
    </header>
  );
}
