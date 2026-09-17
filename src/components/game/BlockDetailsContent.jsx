import MempoolTable from './MempoolTable';
import { formatPowNonce } from '../../lib/powDice';
import { useLocale } from '../../i18n/LocaleContext';

function HashField({ label, value, bytes }) {
  if (!value) return null;
  return (
    <div className="bp-block-structure__hash-field">
      <div className="bp-block-structure__field-head">
        <strong>{label}</strong>
        {bytes && <span>{bytes} B</span>}
      </div>
      <div className="bp-hash bp-hash--compact">{value}</div>
    </div>
  );
}

function ProofTerm({ label, value, emphasized = false }) {
  const Tag = emphasized ? 'strong' : 'span';
  return (
    <div className="bp-easy-proof__term">
      <Tag>{value ?? '—'}</Tag>
      <small>{label}</small>
    </div>
  );
}

export default function BlockDetailsContent({ block, difficulty = 'easy' }) {
  const { tr, locale } = useLocale();
  const isGenesis = block.id === 0;
  const isHard = difficulty === 'hard' && Boolean(block.blockHash);
  const displayNonce = isHard ? formatPowNonce(block.nonce) : block.nonce.toLocaleString();
  const txCount = block.transactions?.length ?? 0;
  const timestamp = block.timestamp
    ? new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
      }).format(new Date(block.timestamp * 1000))
    : null;

  if (isGenesis) {
    return (
      <div className="bp-block-structure bp-block-structure--genesis">
        <div className="bp-block-structure__genesis-mark" aria-hidden>₿</div>
        <div><h4>{tr('genesisBlock')}</h4><p>{tr('genesisSimulationHint')}</p></div>
      </div>
    );
  }

  return (
    <div className="bp-block-structure">
      <section className="bp-block-structure__summary" aria-label={tr('blockSummary')}>
        <div><span>{tr('nonce')}</span><strong>{displayNonce}</strong></div>
        <div><span>{tr('transactions')}</span><strong>{txCount}</strong></div>
        <div><span>{tr('feesEarned')}</span><strong>{block.totalFees ?? 0}</strong></div>
      </section>

      {isHard ? (
        <>
          <section className="bp-block-structure__section">
            <div className="bp-block-structure__section-head">
              <div><h4>{tr('bitcoinHeader')}</h4><p>{tr('bitcoinHeaderHint')}</p></div>
              <span className="bp-block-structure__size">80 B</span>
            </div>
            <div className="bp-block-header-map">
              <div><span>{tr('fieldVersion')}</span><strong>0x{block.version.toString(16).padStart(8, '0')}</strong><small>4 B</small></div>
              <div className="bp-block-header-map__wide"><span>{tr('previousBlockHash')}</span><strong>{block.previousBlockHash}</strong><small>32 B</small></div>
              <div className="bp-block-header-map__wide"><span>{tr('merkleRoot')}</span><strong>{block.merkleRoot}</strong><small>32 B</small></div>
              <div><span>{tr('fieldTimestamp')}</span><strong>{timestamp}</strong><small>{block.timestamp} · 4 B</small></div>
              <div><span>{tr('fieldBits')}</span><strong>0x{block.bits.toString(16).padStart(8, '0')}</strong><small>4 B</small></div>
              <div><span>{tr('nonce')}</span><strong>{displayNonce}</strong><small>4 B</small></div>
            </div>
          </section>
          <section className="bp-block-structure__section">
            <div className="bp-block-structure__section-head"><div><h4>{tr('proofOfWork')}</h4><p>{tr('proofOfWorkHint')}</p></div></div>
            <HashField label={tr('blockHash')} value={block.blockHash} bytes={32} />
            <div className="bp-block-structure__comparison" role="status"><span>{tr('blockHash')}</span><strong>≤</strong><span>{tr('blockTarget')}</span></div>
            <HashField label={tr('blockTarget')} value={block.targetHash} bytes={32} />
          </section>
        </>
      ) : (
        <section className="bp-block-structure__section">
          <div className="bp-block-structure__section-head"><div><h4>{tr('educationalProof')}</h4><p>{tr('educationalProofHint')}</p></div></div>
          <div className="bp-easy-proof">
            <ProofTerm label={tr('prevBlockTarget')} value={block.prevTarget} />
            <b aria-hidden>+</b>
            <ProofTerm label={tr('nonce')} value={block.nonce} />
            <b aria-hidden>+</b>
            <ProofTerm label={tr('blockValueLabel')} value={block.blockValue} />
            <b aria-hidden>=</b>
            <ProofTerm label={tr('blockTarget')} value={block.target} emphasized />
          </div>
        </section>
      )}

      <section className="bp-block-structure__section">
        <div className="bp-block-structure__section-head"><div><h4>{tr('confirmedTransactions')}</h4><p>{tr('confirmedTransactionsHint', { count: txCount })}</p></div></div>
        <MempoolTable transactions={block.transactions} showUserIcons={false} />
      </section>
    </div>
  );
}
