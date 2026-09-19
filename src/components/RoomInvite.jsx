import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import BpIcon from './BpIcon';
import ModalCloseButton from './ModalCloseButton';
import { ICON } from '../assets/icons';
import { useModalFocus } from '../hooks/useModalFocus';
import { buildJoinUrl } from '../lib/roomJoin';
import { useLocale } from '../i18n/LocaleContext';

export default function RoomInvite({ code, compact = false, featured = false }) {
  const { tr } = useLocale();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const joinUrl = buildJoinUrl(code);
  const closeQr = useCallback(() => setQrOpen(false), []);
  const qrDialogRef = useModalFocus(qrOpen, closeQr);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((value) => { if (!cancelled) setQrSrc(value); })
      .catch(() => { if (!cancelled) setQrSrc(''); });
    return () => { cancelled = true; };
  }, [joinUrl]);

  const copyText = async (text, which) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(text);
      setCopyFallback('');
      if (which === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      setCopyFallback(text);
    }
  };

  return (
    <>
      <div className={[
        'bp-room-invite',
        compact ? 'bp-room-invite--compact' : '',
        featured ? 'bp-room-invite--featured' : '',
      ].filter(Boolean).join(' ')}>
        <div className="bp-room-invite__details">
          <div className="bp-room-invite__code-block">
            <p className="bp-room-invite__eyebrow">{tr('roomCode')}</p>
            <div className="bp-room-invite__code">{code}</div>
          </div>
          <div className="bp-room-invite__actions">
            <button type="button" className="bp-btn bp-btn-outline" onClick={() => copyText(code, 'code')}>
              <BpIcon src={ICON.save} className="bp-icon" tone="primary" />
              <span className="bp-btn__label">{copiedCode ? tr('copied') : tr('copyCode')}</span>
            </button>
            <button type="button" className="bp-btn bp-btn-outline" onClick={() => copyText(joinUrl, 'link')}>
              <BpIcon src={ICON.wallet} className="bp-icon" tone="primary" />
              <span className="bp-btn__label">{copiedLink ? tr('copied') : tr('copyJoinLink')}</span>
            </button>
            <button
              type="button"
              className="bp-btn bp-btn-outline bp-room-invite__show-link"
              aria-expanded={linkOpen}
              aria-controls="room-join-link"
              onClick={() => setLinkOpen((open) => !open)}
            >
              <BpIcon src={ICON.info} className="bp-icon" tone="primary" />
              <span className="bp-btn__label">{linkOpen ? tr('hideJoinLink') : tr('showJoinLink')}</span>
            </button>
          </div>
          {linkOpen && (
            <div id="room-join-link" className="bp-room-invite__link-panel">
              <strong>{tr('joinLinkLabel')}</strong>
              <a href={joinUrl} target="_blank" rel="noreferrer" className="bp-room-invite__link-value">
                {joinUrl}
              </a>
            </div>
          )}
          <span className="bp-sr-only" role="status" aria-live="polite">
            {copiedCode || copiedLink ? tr('copied') : ''}
          </span>
          {copyFallback && (
            <label className="bp-room-invite__copy-fallback">
              <span className="bp-hint">{tr('copyFailed')}</span>
              <input
                className="bp-input"
                readOnly
                value={copyFallback}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          )}
        </div>
        {qrSrc && (
          <button
            type="button"
            className="bp-room-invite__qr-button"
            onClick={() => setQrOpen(true)}
            aria-label={tr('enlargeQr')}
          >
            <img src={qrSrc} alt="" className="bp-room-invite__qr" width={200} height={200} />
            <span className="bp-room-invite__qr-hint">{tr('enlargeQr')}</span>
          </button>
        )}
      </div>

      {qrOpen && qrSrc && (
        <div className="modal-overlay bp-qr-overlay" onClick={closeQr}>
          <div
            ref={qrDialogRef}
            className="modal-content bp-qr-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-dialog-title"
          >
            <div className="modal-header">
              <div>
                <p className="bp-room-invite__eyebrow">{tr('roomCode')}</p>
                <h2 id="qr-dialog-title" className="bp-qr-dialog__title">{code}</h2>
              </div>
              <ModalCloseButton onClick={closeQr} />
            </div>
            <div className="modal-body bp-qr-dialog__body">
              <img src={qrSrc} alt={tr('scanQrHint')} className="bp-qr-dialog__image" width={512} height={512} />
              <p className="bp-qr-dialog__hint">{tr('scanQrHint')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
