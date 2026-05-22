import BpIcon from './BpIcon';
import HomeButton from './HomeButton';
import { ICON } from '../assets/icons';
import { useLocale } from '../i18n/LocaleContext';

/**
 * Fixed-order secondary nav: Main menu (if any), then How to play / rules.
 * Use the same component everywhere so controls do not jump between screens.
 */
export default function AppNavActions({
  onHome,
  onRules,
  aboutHref,
  aboutAriaLabel,
  compact = false,
  className = '',
}) {
  const { tr } = useLocale();
  const hasHome = !!onHome;
  const hasRules = !!onRules;
  const hasAbout = !!aboutHref;
  const count = [hasHome, hasRules, hasAbout].filter(Boolean).length;

  if (count === 0) return null;

  return (
    <nav
      className={[
        'bp-nav-actions',
        compact ? 'bp-nav-actions--compact' : '',
        count === 1 ? 'bp-nav-actions--single' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={tr('appNavAria')}
    >
      {hasHome &&
        (compact ? (
          <HomeButton onClick={onHome} compact tone="primary" />
        ) : (
          <HomeButton onClick={onHome} block />
        ))}
      {hasRules &&
        (compact ? (
          <button
            type="button"
            className="bp-icon-btn"
            onClick={onRules}
            aria-label={tr('howToPlay')}
            title={tr('howToPlay')}
          >
            <BpIcon src={ICON.info} className="bp-icon--md" tone="primary" />
          </button>
        ) : (
          <button type="button" className="bp-nav-actions__link" onClick={onRules}>
            <BpIcon src={ICON.info} className="bp-icon--md" tone="primary" />
            <span>{tr('howToPlay')}</span>
          </button>
        ))}
      {hasAbout && (
        <a
          href={aboutHref}
          target="_blank"
          rel="noopener noreferrer"
          className="bp-nav-actions__link"
          aria-label={aboutAriaLabel}
        >
          <BpIcon src={ICON.bitlogo} className="bp-icon--md" tone="primary" />
          <span>{tr('aboutUs')}</span>
        </a>
      )}
    </nav>
  );
}
