import { useLocale } from '../i18n/LocaleContext';

export default function LangToggle() {
  const { locale, setLocale, tr } = useLocale();
  const toggle = () => setLocale(locale === 'en' ? 'it' : 'en');

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggle}
      aria-label={tr('langToggleAria')}
    >
      <span className={locale === 'it' ? 'lang-toggle-active' : ''}>{tr('langIt')}</span>
      <span className={locale === 'en' ? 'lang-toggle-active' : ''}>{tr('langEn')}</span>
    </button>
  );
}
