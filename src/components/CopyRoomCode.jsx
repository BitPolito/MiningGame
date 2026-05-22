import { useState } from 'react';
import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function CopyRoomCode({ code }) {
  const { tr } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="bp-room-code">
      <div className="bp-room-code__value">{code}</div>
      <button type="button" className="bp-btn bp-btn-outline" onClick={copy}>
        <BpIcon src={ICON.save} className="bp-icon" />
        {copied ? tr('copied') : tr('copyCode')}
      </button>
    </div>
  );
}
