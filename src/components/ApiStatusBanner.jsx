import { useEffect, useState } from 'react';
import { checkApiHealth } from '../lib/roomApi';
import { useLocale } from '../i18n/LocaleContext';

export default function ApiStatusBanner({ compact = false }) {
  const { tr } = useLocale();
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      checkApiHealth().then((ok) => {
        if (!cancelled) setOnline(ok);
      });
    };
    check();
    const id = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (online !== false) return null;

  return (
    <div className={`bp-api-banner${compact ? ' bp-api-banner--compact' : ''}`} role="status">
      <strong>{tr('apiOfflineTitle')}</strong>
      {!compact && <p>{tr('apiOfflineBody')}</p>}
      <code className="bp-api-banner__cmd">npm start</code>
    </div>
  );
}
