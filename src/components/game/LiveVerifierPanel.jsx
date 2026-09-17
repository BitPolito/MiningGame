import { useLocale } from '../../i18n/LocaleContext';

export default function LiveVerifierPanel({
  headerHex = '',
  firstHash = '',
  secondHash = '',
  displayHash = '',
  targetHash = '',
  valid = false,
}) {
  const { tr } = useLocale();
  if (!headerHex) return <p className="bp-hint">{tr('verifierAwaitingCandidate')}</p>;

  const steps = [
    { label: tr('header80Bytes'), value: headerHex },
    { label: tr('shaRoundOne'), value: firstHash },
    { label: tr('shaRoundTwo'), value: secondHash },
    { label: tr('displayedBlockHash'), value: displayHash },
    { label: tr('blockTarget'), value: targetHash },
  ];

  return (
    <div className="live-verifier-panel bp-hash-pipeline">
      {steps.map((step, index) => (
        <div className="bp-hash-pipeline__step" key={step.label}>
          <span className="bp-hash-pipeline__number" aria-hidden>{index + 1}</span>
          <div className="bp-hash-pipeline__content">
            <strong>{step.label}</strong>
            <div className="bp-hash bp-hash--compact">{step.value}</div>
          </div>
        </div>
      ))}
      <div className={`bp-status ${valid ? 'bp-status--valid' : ''}`} role="status">
        {valid ? tr('hashBelowTarget') : tr('hashAboveTarget')}
      </div>
    </div>
  );
}
