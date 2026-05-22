import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function RoomSettingsCard({ room, onShowRules }) {
  const { tr } = useLocale();
  if (!room) return null;

  const diffIcon = room.difficulty === 'hard' ? ICON.microscope : ICON.pickaxe;
  return (
    <div className="bp-room-settings">
      <div className="bp-room-settings__head">
        <BpIcon src={ICON.info} className="bp-icon" tone="primary" />
        <span className="bp-room-settings__title">{tr('roomSettings')}</span>
      </div>
      <ul className="bp-room-settings__grid">
        <li>
          <BpIcon src={diffIcon} className="bp-icon--sm" tone="primary" />
          <span className="bp-room-settings__label">{tr('difficultyLabel')}</span>
          <strong>
            {tr(room.difficulty === 'hard' ? 'difficultyHard' : 'difficultyEasy')}
          </strong>
        </li>
        <li>
          <BpIcon src={ICON.coin} className="bp-icon--sm" tone="primary" />
          <span className="bp-room-settings__label">{tr('blocksToWin')}</span>
          <strong>{room.blocksToWin}</strong>
        </li>
        <li>
          <BpIcon src={ICON.party} className="bp-icon--sm" tone="primary" />
          <span className="bp-room-settings__label">{tr('numPlayers')}</span>
          <strong>{room.numPlayers}</strong>
        </li>
      </ul>
      {onShowRules && (
        <div className="bp-room-settings__rules">
          <p className="bp-room-settings__rules-label">{tr('rulesGuideTitle')}</p>
          <div className="bp-rules-card__guides">
            <button
              type="button"
              className="bp-btn bp-btn-outline bp-rules-card__guide-btn"
              onClick={() => onShowRules('easy')}
            >
              <BpIcon src={ICON.pickaxe} className="bp-icon" tone="primary" />
              <span className="bp-btn__label">{tr('rulesOpenEasy')}</span>
            </button>
            <button
              type="button"
              className="bp-btn bp-btn-outline bp-rules-card__guide-btn"
              onClick={() => onShowRules('hard')}
            >
              <BpIcon src={ICON.microscope} className="bp-icon" tone="primary" />
              <span className="bp-btn__label">{tr('rulesOpenHard')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
