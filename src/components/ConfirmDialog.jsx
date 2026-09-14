import { useLocale } from '../i18n/LocaleContext';
import { useModalFocus } from '../hooks/useModalFocus';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const { tr } = useLocale();
  const dialogRef = useModalFocus(true, onCancel);

  return (
    <div className="modal-overlay bp-confirm-overlay" onClick={onCancel} role="presentation">
      <div
        ref={dialogRef}
        className="bp-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bp-confirm-title"
        aria-describedby="bp-confirm-message"
      >
        <h2 id="bp-confirm-title" className="bp-confirm-dialog__title">
          {title}
        </h2>
        <p id="bp-confirm-message" className="bp-confirm-dialog__message">
          {message}
        </p>
        <div className="bp-confirm-dialog__actions">
          <button type="button" className="bp-btn bp-btn-ghost" onClick={onCancel} autoFocus>
            {cancelLabel ?? tr('cancel')}
          </button>
          <button type="button" className="bp-btn bp-btn-solid" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
