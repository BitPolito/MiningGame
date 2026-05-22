import BpIcon from './BpIcon';
import PlayerAvatar from './PlayerAvatar';
import { ICON } from '../assets/icons';
import { getRoomBlocksToWin } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

export default function GameResultsPanel({ room, playerName, isHost }) {
  const { tr } = useLocale();
  if (!room?.winner) return null;

  const goal = getRoomBlocksToWin(room);
  const sorted = [...(room.players ?? [])].sort((a, b) => b.blocks - a.blocks);
  const youWon = room.winner === playerName;

  return (
    <div className="bp-results">
      <div className={`bp-results-hero${youWon ? ' bp-results-hero--won' : ''}`}>
        <BpIcon
          src={youWon ? ICON.crown : ICON.party}
          className="bp-icon--2xl bp-results-hero__icon"
          tone="primary"
        />
        <h2 className="bp-results-hero__title">
          {youWon ? tr('youWon') : tr('playerWon', { name: room.winner })}
        </h2>
        <p className="bp-results-hero__sub">
          {tr('winSubtitleBlocks', { name: room.winner, goal })}
        </p>
        {isHost && (
          <p className="bp-results-hero__host">{tr('hostResultsHint')}</p>
        )}
      </div>

      <div className="bp-results-board">
        <h3 className="bp-results-board__title">{tr('finalStandings')}</h3>
        <ol className="bp-results-board__list">
          {sorted.map((p, i) => (
            <li
              key={p.name}
              className={[
                'bp-results-board__row',
                p.name === room.winner ? 'bp-results-board__row--winner' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="bp-results-board__rank">{i + 1}</span>
              <PlayerAvatar name={p.name} size="sm" />
              <span className="bp-results-board__name">
                {p.name}
                {p.name === playerName && (
                  <span className="bp-player-list__you">{tr('you')}</span>
                )}
              </span>
              <span className="bp-results-board__score">
                {p.blocks}/{goal}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
