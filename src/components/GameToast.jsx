import { useEffect } from 'react';

export default function GameToast({ message, variant = 'ok', onDismiss }) {
  useEffect(() => {
    if (!message || !onDismiss) return;
    const t = setTimeout(onDismiss, variant === 'ok' ? 5000 : 8000);
    return () => clearTimeout(t);
  }, [message, variant, onDismiss]);

  if (!message) return null;

  return (
    <div
      className={`game-toast game-toast--${variant}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="game-toast-close" onClick={onDismiss} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}
