import { useLocale } from '../i18n/LocaleContext';

export default function BackButton({ onClick, className = '' }) {
  const { tr } = useLocale();

  return (
    <button
      type="button"
      className={`bp-back-btn${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span className="bp-back-btn__icon" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span className="bp-back-btn__label">{tr('back')}</span>
    </button>
  );
}
