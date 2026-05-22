import { useLocale } from '../i18n/LocaleContext';
import { BITPOLITO_WEBSITE_URL } from '../lib/siteConfig';

export default function AppFooter({ variant = 'menu' }) {
  const { tr } = useLocale();

  const credit = (
    <>
      {tr('footerMadeWith')} <img src="/love.svg" alt="" className="bp-footer__heart" width={14} height={14} />{' '}
      {tr('footerByPrefix')}
      <a
        href={BITPOLITO_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bp-footer__brand"
      >
        {tr('footerByBrand')}
      </a>
    </>
  );

  if (variant === 'menu') {
    return (
      <div className="menu-footer">
        <img src="/cows.svg" alt="" className="menu-cows" />
        <div className="made-with-love">{credit}</div>
      </div>
    );
  }

  return (
    <footer className="bp-footer">
      <img src="/cows.svg" alt="" className="menu-cows" style={{ margin: '0 auto 12px', display: 'block', width: 160 }} />
      <p className="bp-footer__line">{credit}</p>
    </footer>
  );
}
