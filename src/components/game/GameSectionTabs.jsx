import BpIcon from '../BpIcon';
import { useLocale } from '../../i18n/LocaleContext';

/**
 * @typedef {object} GameTab
 * @property {string} id
 * @property {string} label
 * @property {string} [iconSrc]
 * @property {string} [badge]
 */

export function GameTabBar({ value, onChange, tabs }) {
  const { tr } = useLocale();
  const duo = tabs.length === 2;

  return (
    <div
      className={`bp-game-tabs__bar${duo ? ' bp-game-tabs__bar--duo' : ''}`}
      role="tablist"
      aria-label={tr('gameTabsAria')}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`game-tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`game-panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            className={`bp-game-tabs__tab${active ? ' bp-game-tabs__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.iconSrc && (
              <BpIcon
                src={tab.iconSrc}
                className="bp-icon--sm"
                tone={active ? 'on-solid' : 'primary'}
              />
            )}
            <span className="bp-game-tabs__label">{tab.label}</span>
            {tab.badge != null && tab.badge !== '' && (
              <span className="bp-game-tabs__badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function GameTabPanels({ value, tabs, panels }) {
  return (
    <div className="bp-game-tabs__panels">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`game-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`game-tab-${tab.id}`}
          hidden={value !== tab.id}
          className={`bp-game-tabs__panel${value === tab.id ? ' bp-game-tabs__panel--active' : ''}`}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}

export default function GameSectionTabs({ value, onChange, tabs, panels }) {
  return (
    <div className="bp-game-tabs">
      <GameTabBar value={value} onChange={onChange} tabs={tabs} />
      <GameTabPanels value={value} tabs={tabs} panels={panels} />
    </div>
  );
}
