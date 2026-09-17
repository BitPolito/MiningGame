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
    <ol className="bp-mining-phases" aria-label={tr('miningPhasesAria')}>
      {PHASES.map((item, index) => (
        <li
          key={item.id}
          className={[
            'bp-mining-phases__item',
            index < activeIndex ? 'bp-mining-phases__item--done' : '',
            index === activeIndex ? 'bp-mining-phases__item--active' : '',
          ].filter(Boolean).join(' ')}
          aria-current={index === activeIndex ? 'step' : undefined}
        >
          <span className="bp-mining-phases__number" aria-hidden>{index + 1}</span>
          <span>{tr(item.labelKey)}</span>
        </li>
      ))}
    </ol>
  );
}
