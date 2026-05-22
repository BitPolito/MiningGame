/**
 * Grouped block inside a PanelCard — keeps titles, spacing, and hierarchy consistent.
 */
export default function PanelSection({
  title,
  children,
  variant = 'default',
  className = '',
}) {
  return (
    <section
      className={`bp-panel-section bp-panel-section--${variant} ${className}`.trim()}
    >
      {title && <h3 className="bp-panel-section__title">{title}</h3>}
      <div className="bp-panel-section__content">{children}</div>
    </section>
  );
}
