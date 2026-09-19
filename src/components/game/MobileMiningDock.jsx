import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import ChevronDownIcon from './ChevronDownIcon';

export default function MobileMiningDock({ summary, details, activity, stageLabel, variant, children }) {
  const { tr } = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bp-mobile-mining-dock${variant ? ` bp-mobile-mining-dock--${variant}` : ''}${expanded ? ' bp-mobile-mining-dock--expanded' : ''}`}
      role="region"
      aria-label={tr('miningController')}
    >
      <div className="bp-mobile-mining-dock__head">
        <span className="bp-mobile-mining-dock__stage">{stageLabel || tr('miningController')}</span>
        {details && (
          <button
            type="button"
            className="bp-mobile-mining-dock__handle"
            aria-expanded={expanded}
            aria-controls="bp-mobile-mining-details"
            onClick={() => setExpanded((value) => !value)}
          >
            <span>{tr(expanded ? 'collapseMiningController' : 'expandMiningController')}</span>
            <span className="bp-mobile-mining-dock__chevron"><ChevronDownIcon /></span>
          </button>
        )}
      </div>
      {activity && <div className="bp-mobile-mining-dock__activity">{activity}</div>}
      {details && <div id="bp-mobile-mining-details" className="bp-mobile-mining-dock__details" hidden={!expanded}>{details}</div>}
      <div className="bp-mobile-mining-dock__body">
        <div className="bp-mobile-mining-dock__status">{summary}</div>
        {children}
      </div>
    </div>
  );
}
