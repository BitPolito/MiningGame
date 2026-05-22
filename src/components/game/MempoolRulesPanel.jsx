import BpIcon from '../BpIcon';
import { ICON } from '../../assets/icons';
import { useLocale } from '../../i18n/LocaleContext';

/** In-game summary of mempool transaction-selection rules only. */
export default function MempoolRulesPanel({ variant = 'full', onOpenGuide }) {
  const { tr } = useLocale();
  const compact = variant === 'compact';

  if (compact) {
    return (
      <div className="bp-rules-card bp-rules-card--compact bp-rules-card--inline">
        <ol className="bp-rules-card__list">
          <li>{tr('mempoolRuleCount')}</li>
          <li>{tr('mempoolRuleBalance')}</li>
          <li>{tr('mempoolRuleFees')}</li>
        </ol>
        <p className="bp-rules-card__note">{tr('mempoolRulesNote')}</p>
      </div>
    );
  }

  return (
    <div className="bp-rules-card">
      <div className="bp-rules-card__head">
        <span className="bp-rules-card__icon-tile" aria-hidden>
          <BpIcon src={ICON.info} className="bp-icon--md" tone="primary" />
        </span>
        <div>
          <p className="bp-rules-card__title">{tr('mempoolRulesTitle')}</p>
          <p className="bp-rules-card__lead">{tr('mempoolRulesLead')}</p>
        </div>
      </div>

      <ol className="bp-rules-card__list">
        <li>{tr('mempoolRuleCount')}</li>
        <li>{tr('mempoolRuleBalance')}</li>
        <li>{tr('mempoolRuleFees')}</li>
      </ol>

      <p className="bp-rules-card__note">{tr('mempoolRulesNote')}</p>

      {onOpenGuide && (
        <div className="bp-rules-card__guides">
          <button
            type="button"
            className="bp-btn bp-btn-outline bp-rules-card__guide-btn"
            onClick={() => onOpenGuide('easy')}
          >
            <BpIcon src={ICON.pickaxe} className="bp-icon" tone="primary" />
            <span className="bp-btn__label">{tr('rulesOpenEasy')}</span>
          </button>
          <button
            type="button"
            className="bp-btn bp-btn-outline bp-rules-card__guide-btn"
            onClick={() => onOpenGuide('hard')}
          >
            <BpIcon src={ICON.microscope} className="bp-icon" tone="primary" />
            <span className="bp-btn__label">{tr('rulesOpenHard')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
