import BpIcon from './BpIcon';

export default function ActionCard({ title, description, onClick, iconSrc, iconNode, variant = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bp-action-card${variant === 'primary' ? ' bp-action-card--primary' : ''}`}
    >
      <span className="bp-action-card__icon">
        {iconNode ||
          (iconSrc ? (
            <BpIcon
              src={iconSrc}
              className="bp-icon--lg"
              tone={variant === 'primary' ? 'on-solid' : 'primary'}
            />
          ) : null)}
      </span>
      <span className="bp-action-card__text">
        <span className="bp-action-card__title">{title}</span>
        {description && <span className="bp-action-card__desc">{description}</span>}
      </span>
      <span className="bp-action-card__chevron" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </button>
  );
}
