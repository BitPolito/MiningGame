import BpIcon from './BpIcon';

export default function PanelCard({
  title,
  iconSrc,
  action,
  children,
  className = '',
  bodyClassName = '',
  compact = false,
  active = false,
}) {
  return (
    <section
      className={`bp-panel${compact ? ' bp-panel--compact' : ''}${active ? ' bp-panel--active' : ''} ${className}`.trim()}
    >
      <header className="bp-panel__head">
        <div className="bp-panel__title-row">
          {iconSrc && (
            <span className="bp-panel__icon-tile">
              <BpIcon src={iconSrc} className="bp-icon--md" tone="primary" />
            </span>
          )}
          <h2 className="bp-panel__title">{title}</h2>
        </div>
        {action}
      </header>
      <div className={`bp-panel__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
