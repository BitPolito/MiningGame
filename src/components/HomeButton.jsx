import BpIcon from './BpIcon';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

export default function HomeButton({ onClick, compact = false, block = false, tone = 'primary' }) {
  const { tr } = useLocale();

  if (compact) {
    return (
      <button
        type="button"
        className="bp-icon-btn"
        onClick={onClick}
        aria-label={tr('mainMenu')}
        title={tr('mainMenu')}
      >
        <BpIcon src={ICON.home} className="bp-icon--md" tone={tone === 'on-solid' ? 'on-solid' : 'primary'} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`bp-btn bp-btn-outline bp-home-btn${block ? ' bp-btn--block bp-nav-actions__btn' : ''}`}
      onClick={onClick}
    >
      <BpIcon src={ICON.home} className="bp-icon--md" tone="primary" />
      <span className="bp-btn__label">{tr('mainMenu')}</span>
    </button>
  );
}
