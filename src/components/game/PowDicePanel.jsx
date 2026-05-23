import { useEffect, useState } from 'react';
import BpIcon from '../BpIcon';
import { ICON } from '../../assets/icons';
import { useLocale } from '../../i18n/LocaleContext';
import { isDiceReady } from '../../lib/powDice';

function DieFace({ value, rolling, error }) {
  const pips =
    value == null
      ? []
      : [
          [],
          [[2, 2]],
          [
            [1, 1],
            [3, 3],
          ],
          [
            [1, 1],
            [2, 2],
            [3, 3],
          ],
          [
            [1, 1],
            [1, 3],
            [3, 1],
            [3, 3],
          ],
          [
            [1, 1],
            [1, 3],
            [2, 2],
            [3, 1],
            [3, 3],
          ],
          [
            [1, 1],
            [1, 3],
            [2, 1],
            [2, 3],
            [3, 1],
            [3, 3],
          ],
        ][value] ?? [];

  return (
    <span
      className={`bp-die${rolling ? ' bp-die--rolling' : ''}${value == null ? ' bp-die--empty' : ''}${error ? ' bp-die--error' : ''}`}
      aria-label={value == null ? '?' : String(value)}
    >
      {value == null ? (
        <span className="bp-die__placeholder">?</span>
      ) : (
        <span className="bp-die__pips">
          {pips.map(([r, c], i) => (
            <span key={i} className="bp-die__pip" style={{ gridRow: r, gridColumn: c }} />
          ))}
        </span>
      )}
    </span>
  );
}

export default function PowDicePanel({
  diceFaces,
  rollCount,
  nonce,
  rolling,
  disabled,
  powFound,
  error,
  onRoll,
}) {
  const { tr } = useLocale();
  const [displayFaces, setDisplayFaces] = useState(diceFaces);

  useEffect(() => {
    if (!rolling) {
      setDisplayFaces(diceFaces);
      return undefined;
    }

    setDisplayFaces(diceFaces);
    const id = setInterval(() => {
      setDisplayFaces([
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ]);
    }, 70);
    return () => clearInterval(id);
  }, [rolling, diceFaces]);

  const ready = isDiceReady(displayFaces);

  return (
    <div className="bp-pow-toolbar">
      <div className="bp-pow-toolbar__dice" aria-live="polite">
        <DieFace value={displayFaces[0]} rolling={rolling} error={error} />
        <DieFace value={displayFaces[1]} rolling={rolling} error={error} />
      </div>

      <div className="bp-pow-toolbar__body">
        <p className="bp-pow-toolbar__hint">
          {rollCount > 0 ? tr('powRollCount', { count: rollCount }) : tr('powRollHint')}
        </p>
        {ready ? (
          <div className="bp-pow-toolbar__nonce" aria-live="polite">
            <span className="bp-pow-toolbar__nonce-label">{tr('nonce')}</span>
            <span className="bp-pow-toolbar__nonce-value">{nonce.toLocaleString()}</span>
          </div>
        ) : (
          <div className="bp-pow-toolbar__nonce bp-pow-toolbar__nonce--empty">
            <span className="bp-pow-toolbar__nonce-label">{tr('nonce')}</span>
            <span className="bp-pow-toolbar__nonce-value">{tr('nonceNotRolledYet')}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="bp-btn bp-btn-solid bp-pow-toolbar__btn"
        onClick={onRoll}
        disabled={disabled || rolling || powFound}
      >
        <BpIcon src={ICON.party} className="bp-icon--sm" tone="on-solid" />
        <span className="bp-btn__label">{rolling ? tr('powRolling') : tr('rollDice')}</span>
      </button>
    </div>
  );
}
