import { BRAND } from '../assets/icons';
import LangToggle from './LangToggle';
import { useLocale } from '../i18n/LocaleContext';

export default function AppHeader({ title }) {
  const { tr } = useLocale();

  return (
    <header className="bp-header">
      <div className="bp-header__inner">
        <div className="bp-header__brand">
          <img src={BRAND.cow} alt="" className="bp-header__cow" width={36} height={36} />
          <span className="bp-header__title">{title || tr('pageTitle')}</span>
        </div>
        <LangToggle />
      </div>
    </header>
  );
}
