import { useEffect } from 'react';
import { useLocale } from '../i18n/LocaleContext';

export default function GameToast({ message, variant = 'ok', onDismiss }) {
  const { tr } = useLocale();
  useEffect(() => {
    if (!message || !onDismiss) return;
    const t = setTimeout(onDismiss, variant === 'ok' ? 5000 : 8000);
    return () => clearTimeout(t);
  }, [message, variant, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`game-toast game-toast--${variant}`}
      role={variant === 'err' ? 'alert' : 'status'}
      aria-live={variant === 'err' ? 'assertive' : 'polite'}
    >
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="game-toast-close" onClick={onDismiss} aria-label={tr('close')}>
          ×
        </button>
      )}
    </div>
  );
}
