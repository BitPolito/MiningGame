import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { useSha256 } from '../../hooks/useSha256';

/** Optional SHA-256 checker for Hard mode (tx string + nonce). */
export default function LiveVerifierPanel() {
  const { tr } = useLocale();
  const [verifyRaw, setVerifyRaw] = useState('');
  const [verifyNonce, setVerifyNonce] = useState('');
  const verifyTxHash = useSha256(verifyRaw);
  const verifyFinalHash = useSha256(
    verifyRaw && verifyNonce !== '' ? verifyTxHash + verifyNonce : '',
  );

  return (
    <div className="live-verifier-panel">
      <textarea
        className="bp-input bp-input--mono"
        rows={4}
        value={verifyRaw}
        onChange={(e) => setVerifyRaw(e.target.value)}
        placeholder={tr('verifierPlaceholder')}
      />
      <div className="bp-hash bp-hash--compact">
        {verifyRaw ? verifyTxHash || tr('computing') : tr('verifierAwaiting')}
      </div>
      <input
        className="bp-input bp-input--mono"
        type="text"
        value={verifyNonce}
        onChange={(e) => setVerifyNonce(e.target.value)}
        placeholder={tr('nonce')}
      />
      <div className="bp-hash bp-hash--compact">
        {verifyRaw && verifyNonce !== ''
          ? verifyFinalHash || tr('computing')
          : tr('verifierFinal')}
      </div>
    </div>
  );
}
