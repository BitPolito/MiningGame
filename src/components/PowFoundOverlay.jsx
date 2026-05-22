import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function PowFoundOverlay({ open, nonce, diceFaces, finalHash, onClose }) {
  const { tr } = useLocale();

  if (!open) return null;

  return (
    <div className="bp-pow-overlay" role="presentation">
      <div
        className="bp-pow-found-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-pow-found-title"
        onClick={(e) => e.stopPropagation()}
      >
        <BpIcon src={ICON.pickaxe} className="bp-icon--lg" tone="primary" />
        <h2 id="bp-pow-found-title" className="bp-pow-found-card__title">
          {tr('powFoundTitle')}
        </h2>
        <p className="bp-pow-found-card__message">{tr('powFoundMessage', { nonce })}</p>
        {diceFaces?.[0] != null && diceFaces?.[1] != null && (
          <p className="bp-pow-found-card__dice" aria-label={tr('powLuckyRoll')}>
            <span className="bp-pow-found-card__die">{diceFaces[0]}</span>
            <span className="bp-pow-found-card__die">{diceFaces[1]}</span>
          </p>
        )}
        <dl className="bp-pow-found-card__details">
          <div className="bp-pow-found-card__row">
            <dt>{tr('nonce')}</dt>
            <dd>{nonce.toLocaleString()}</dd>
          </div>
          {finalHash && (
            <div className="bp-pow-found-card__row bp-pow-found-card__row--hash">
              <dt>{tr('hashResult')}</dt>
              <dd>{finalHash}</dd>
            </div>
          )}
        </dl>
        <button type="button" className="bp-btn bp-btn-solid bp-btn--block" onClick={onClose}>
          <span className="bp-btn__label">{tr('close')}</span>
        </button>
      </div>
    </div>
  );
}
