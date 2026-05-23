import LangToggle from '../LangToggle';
import AppNavActions from '../AppNavActions';
import SelectionCounter from '../SelectionCounter';
import { useLocale } from '../../i18n/LocaleContext';

/**
 * Fixed in-game HUD: navigation + live metrics (replaces toolbar + status bar).
 * @param {{ label: string, value: string | number, mono?: boolean, title?: string }[]} stats
 */
export default function GameHud({
  onHome,
  onHelp,
  difficulty,
  blocksMined = 0,
  blockGoal = 6,
  roomSeed,
  selectionCount = 0,
  stats = [],
  children,
}) {
  const { tr } = useLocale();
  const progressPct =
    blockGoal > 0 ? Math.min(100, (blocksMined / blockGoal) * 100) : 0;

  return (
    <header className="bp-game-hud" aria-label={tr('gameHudAria')}>
      <div className="bp-game-hud__nav">
        <div className="bp-game-hud__nav-start">
          <AppNavActions onHome={onHome} onRules={onHelp} compact />
          <span
            className={`bp-game-hud__pill${difficulty === 'hard' ? ' bp-game-hud__pill--hard' : ''}`}
          >
            {tr(difficulty === 'easy' ? 'difficultyEasy' : 'difficultyHard')}
          </span>
          {roomSeed && (
            <span className="bp-game-hud__pill bp-game-hud__pill--room" title={tr('roomCode')}>
              {roomSeed}
            </span>
          )}
        </div>
        <div className="bp-game-hud__nav-end">
          <LangToggle />
        </div>
      </div>

      <div className="bp-game-hud__metrics">
        <div
          className={`bp-hud-tile bp-hud-tile--tx${selectionCount === 3 ? ' bp-hud-tile--ready' : ''}`}
        >
          <span className="bp-hud-tile__label">{tr('hudTxLabel')}</span>
          <SelectionCounter count={selectionCount} />
        </div>

        <div className="bp-hud-tile bp-hud-tile--block">
          <span className="bp-hud-tile__label">{tr('blockProgressLabel')}</span>
          <div className="bp-hud-block">
            <div className="bp-hud-block__track" aria-hidden>
              <div className="bp-hud-block__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="bp-hud-block__nums">
              {Math.min(blocksMined, blockGoal)}
              <span className="bp-hud-block__sep">/</span>
              {blockGoal}
            </span>
          </div>
        </div>

        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bp-hud-tile${stat.mono ? ' bp-hud-tile--mono' : ''}${stat.wide ? ' bp-hud-tile--wide' : ''}`}
            title={stat.title}
          >
            <span className="bp-hud-tile__label">{stat.label}</span>
            <span
              className={`bp-hud-tile__value${stat.mono ? ' bp-hud-tile__value--mono' : ''}`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
      {children}
    </header>
  );
}
