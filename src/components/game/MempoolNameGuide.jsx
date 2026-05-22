import PlayerAvatar from '../PlayerAvatar';
import { useLocale } from '../../i18n/LocaleContext';
import { USERS, getNameValue } from '../../lib/gameConstants.js';

/** Compact name → letter-sum reference (A=1 … Z=26). */
export default function MempoolNameGuide({ showUserIcons = true, compact = false }) {
  const { tr } = useLocale();

  return (
    <div
      className={`mempool-name-guide${compact ? ' mempool-name-guide--compact' : ''}`}
      role="note"
      aria-label={tr('mempoolNamesTitle')}
    >
      {!compact ? <p className="bp-hint mempool-name-guide__hint">{tr('nameGuideHint')}</p> : null}
      <div className="mempool-name-guide__chips">
        {USERS.map((name) => (
          <span key={name} className="mempool-name-guide__chip">
            {showUserIcons ? <PlayerAvatar name={name} size="sm" inline /> : null}
            <span className="mempool-name-guide__label">{name}</span>
            <span className="mempool-name-guide__val">{getNameValue(name)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
