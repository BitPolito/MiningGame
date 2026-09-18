import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';

export default function MobileMiningDock({ summary, details, stageLabel, children }) {
  const { tr } = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bp-mobile-mining-dock${expanded ? ' bp-mobile-mining-dock--expanded' : ''}`}
      aria-label={tr('miningController')}
    >
      <button
        type="button"
        className="bp-mobile-mining-dock__handle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{stageLabel || tr('miningController')}</span>
        <span aria-hidden className="bp-mobile-mining-dock__chevron">⌃</span>
        <span className="bp-sr-only">
          {tr(expanded ? 'collapseMiningController' : 'expandMiningController')}
        </span>
      </button>
      {expanded && <div className="bp-mobile-mining-dock__details">{details}</div>}
      <div className="bp-mobile-mining-dock__body">
        <div className="bp-mobile-mining-dock__status">{summary}</div>
        {children}
      </div>
    </div>
  );
}
