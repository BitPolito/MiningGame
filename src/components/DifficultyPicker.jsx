import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function DifficultyPicker({ value, onChange, compact = false }) {
  const { tr } = useLocale();
  const modes = [
    { id: 'easy', icon: ICON.pickaxe, titleKey: 'difficultyEasy', descKey: 'difficultyEasyDesc' },
    { id: 'hard', icon: ICON.microscope, titleKey: 'difficultyHard', descKey: 'difficultyHardDesc' },
  ];

  return (
    <div
      className={`bp-difficulty${compact ? ' bp-difficulty--compact' : ''}`}
      role="radiogroup"
      aria-label={tr('difficultyLabel')}
    >
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="radio"
          aria-checked={value === mode.id}
          className={`bp-difficulty__btn${value === mode.id ? ' bp-difficulty__btn--active' : ''}`}
          onClick={() => onChange(mode.id)}
        >
          <span className="bp-difficulty__icon">
            <BpIcon
              src={mode.icon}
              className="bp-icon--md"
              tone={value === mode.id ? 'on-solid' : 'primary'}
            />
          </span>
          <span className="bp-difficulty__text">
            <span className="bp-difficulty__title">{tr(mode.titleKey)}</span>
            <span className="bp-difficulty__desc">{tr(mode.descKey)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
