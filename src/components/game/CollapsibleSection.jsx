import { useState } from 'react';
import BpIcon from '../BpIcon';

export default function CollapsibleSection({
  title,
  iconSrc,
  children,
  defaultOpen = false,
  variant = 'default',
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`bp-collapse${variant === 'panel' ? ' bp-collapse--panel' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="bp-collapse__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bp-collapse__trigger-left">
          {iconSrc && (
            <span className="bp-collapse__icon-tile">
              <BpIcon src={iconSrc} className="bp-icon--md" tone="tile" />
            </span>
          )}
          <span className="bp-collapse__title">{title}</span>
        </span>
        <span className={`bp-collapse__chevron${open ? ' bp-collapse__chevron--open' : ''}`} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && <div className="bp-collapse__body">{children}</div>}
    </section>
  );
}
