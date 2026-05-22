import { useLocale } from '../i18n/LocaleContext';

export default function ModalCloseButton({ onClick, className = '' }) {
  const { tr } = useLocale();

  return (
    <button
      type="button"
      className={`bp-modal-close${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={tr('close')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
