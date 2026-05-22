import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { getRoomBlocksToWin } from '../lib/roomConfig';
import { normalizePlayerName } from '../lib/playerNames';
import { useLocale } from '../i18n/LocaleContext';

export default function WinOverlay({
  roomData,
  playerName,
  onHome,
  onViewResults,
  soloWin = false,
  blocksToWin,
}) {
  const { tr } = useLocale();
  const goal = blocksToWin ?? getRoomBlocksToWin(roomData);

  if (soloWin) {
    return (
      <div className="bp-win-overlay">
        <div className="bp-win-card">
          <BpIcon src={ICON.crown} className="bp-icon--2xl" tone="primary" label={tr('youWon')} />
          <h1 className="bp-win-card__title bp-win-card__title--won">{tr('youWon')}</h1>
          <p className="bp-win-card__sub">{tr('gameWonSolo', { goal })}</p>
          <button type="button" className="bp-btn bp-btn-solid" onClick={onHome}>
            {tr('returnLobby')}
          </button>
        </div>
      </div>
    );
  }

  if (!roomData || roomData.status !== 'finished') return null;

  const won =
    normalizePlayerName(roomData.winner) === normalizePlayerName(playerName);
  const title = won ? tr('youWon') : tr('playerWon', { name: roomData.winner });

  return (
    <div className="bp-win-overlay">
      <div className="bp-win-card">
        <BpIcon
          src={won ? ICON.crown : ICON.hourglass}
          className={won ? 'bp-icon--2xl' : 'bp-icon--lg'}
          tone="primary"
        />
        <h1 className={`bp-win-card__title${won ? ' bp-win-card__title--won' : ''}`}>{title}</h1>
        <p className="bp-win-card__sub">
          {tr('winSubtitleBlocks', { name: roomData.winner, goal })}
        </p>
        <div className="bp-win-card__actions">
          {onViewResults && (
            <button type="button" className="bp-btn bp-btn-solid" onClick={onViewResults}>
              {tr('viewResults')}
            </button>
          )}
          <button type="button" className="bp-btn bp-btn-ghost" onClick={onHome}>
            {tr('returnLobby')}
          </button>
        </div>
      </div>
    </div>
  );
}
