import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { buildJoinUrl } from '../lib/roomJoin';
import { useLocale } from '../i18n/LocaleContext';

export default function RoomInvite({ code, compact = false }) {
  const { tr } = useLocale();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(!compact);
  const [qrSrc, setQrSrc] = useState('');
  const joinUrl = buildJoinUrl(code);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
      .then((value) => { if (!cancelled) setQrSrc(value); })
      .catch(() => { if (!cancelled) setQrSrc(''); });
    return () => { cancelled = true; };
  }, [joinUrl]);

  const copyText = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Clipboard access can be unavailable in non-secure local contexts.
    }
  };

  return (
    <div className={`bp-room-invite${compact ? ' bp-room-invite--compact' : ''}`}>
      <div className="bp-room-invite__code">{code}</div>
      <div className="bp-room-invite__actions">
        <button type="button" className="bp-btn bp-btn-outline" onClick={() => copyText(code, 'code')}>
          <BpIcon src={ICON.save} className="bp-icon" tone="primary" />
          <span className="bp-btn__label">{copiedCode ? tr('copied') : tr('copyCode')}</span>
        </button>
        <button type="button" className="bp-btn bp-btn-outline" onClick={() => copyText(joinUrl, 'link')}>
          <BpIcon src={ICON.wallet} className="bp-icon" tone="primary" />
          <span className="bp-btn__label">{copiedLink ? tr('copied') : tr('copyJoinLink')}</span>
        </button>
      </div>
      {compact ? (
        <button
          type="button"
          className="bp-btn bp-btn-ghost bp-room-invite__qr-toggle"
          onClick={() => setShowQr((value) => !value)}
          aria-expanded={showQr}
        >
          {showQr ? tr('hideQr') : tr('showQr')}
        </button>
      ) : null}
      {(!compact || showQr) && qrSrc && (
        <div className="bp-room-invite__qr-wrap">
          <img src={qrSrc} alt={tr('scanQrHint')} className="bp-room-invite__qr" width={200} height={200} />
          <p className="bp-room-invite__qr-hint">{tr('scanQrHint')}</p>
        </div>
      )}
    </div>
  );
}
