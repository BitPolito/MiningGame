import { useEffect, useState } from 'react';
import BpIcon from '../BpIcon';
import { ICON } from '../../assets/icons';
import { useLocale } from '../../i18n/LocaleContext';
import { formatPowNonce, isDiceReady, rollDiceFaces } from '../../lib/powDice';

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

function useDisplayFaces(diceFaces, rolling) {
  const [displayFaces, setDisplayFaces] = useState(diceFaces);
  useEffect(() => {
    if (!rolling) {
      setDisplayFaces(diceFaces);
      return undefined;
    }
    const id = setInterval(() => {
      setDisplayFaces(rollDiceFaces());
    }, 85);
    return () => clearInterval(id);
  }, [rolling, diceFaces]);
  return displayFaces;
}

export function CompactDice({ diceFaces, rolling }) {
  const displayFaces = useDisplayFaces(diceFaces, rolling);
  return (
    <span className="bp-compact-dice" aria-hidden="true">
      {displayFaces.map((face, index) => <DieFace key={index} value={face} rolling={rolling} />)}
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
  const displayFaces = useDisplayFaces(diceFaces, rolling);
  const ready = isDiceReady(displayFaces);

  return (
    <div className="bp-pow-toolbar">
      <div className="bp-pow-toolbar__dice" aria-live="polite">
        {displayFaces.map((face, index) => <DieFace key={index} value={face} rolling={rolling} error={error} />)}
      </div>

      <div className="bp-pow-toolbar__body">
        <p className="bp-pow-toolbar__hint">
          {rollCount === 1 ? tr('powRollOne') : rollCount > 1 ? tr('powRollCount', { count: rollCount }) : tr('powRollHint')}
        </p>
        {ready && rollCount > 0 && (
          <div className="bp-pow-toolbar__nonce" aria-live="polite">
            <span className="bp-pow-toolbar__nonce-label">{tr('nonce')}</span>
            <span className="bp-pow-toolbar__nonce-value">{formatPowNonce(nonce)}</span>
          </div>
        )}
      </div>

      <div className="bp-pow-toolbar__actions">
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
    </div>
  );
}
