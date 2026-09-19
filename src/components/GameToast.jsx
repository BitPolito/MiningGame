import { useEffect, useRef } from 'react';
import { useLocale } from '../i18n/LocaleContext';

export default function GameToast({ message, variant = 'ok', noticeId = 0, onDismiss }) {
  const { tr } = useLocale();
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => dismissRef.current?.(), variant === 'ok' ? 5000 : 8000);
    return () => clearTimeout(timer);
  }, [message, variant, noticeId]);

  if (!message) return null;

  return (
    <div
      key={noticeId}
      className={`game-toast game-toast--${variant}`}
      role={variant === 'err' ? 'alert' : 'status'}
      aria-live={variant === 'err' ? 'assertive' : 'polite'}
    >
      <span className="game-toast__message">{message}</span>
      {onDismiss && (
        <button type="button" className="game-toast-close" onClick={onDismiss} aria-label={tr('close')}>
          ×
        </button>
      )}
    </div>
  );
}
