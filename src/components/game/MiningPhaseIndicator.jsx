import { useLocale } from '../../i18n/LocaleContext';

const PHASES = [
  { id: 'select', labelKey: 'phaseSelect' },
  { id: 'mine', labelKey: 'phaseMine' },
  { id: 'confirm', labelKey: 'phaseConfirm' },
];

export default function MiningPhaseIndicator({ phase = 'select' }) {
  const { tr } = useLocale();
  const activeIndex = Math.max(0, PHASES.findIndex((item) => item.id === phase));

  return (
    <div className="bp-mining-phases" aria-label={tr('miningPhasesAria')}>
      <span className="bp-mining-phases__current">
        <span className="bp-mining-phases__number" aria-hidden>{activeIndex + 1}</span>
        <strong aria-current="step">{tr(PHASES[activeIndex].labelKey)}</strong>
      </span>
      <span className="bp-mining-phases__track" aria-hidden="true">
        {PHASES.map((item, index) => (
          <span
            key={item.id}
            className={`bp-mining-phases__segment${index <= activeIndex ? ' bp-mining-phases__segment--active' : ''}`}
          />
        ))}
      </span>
    </div>
  );
}
