import LangToggle from './LangToggle';
import BackButton from './BackButton';
import AppNavActions from './AppNavActions';
import ApiStatusBanner from './ApiStatusBanner';

export default function LobbyShell({
  title,
  subtitle,
  onBack,
  onHome,
  onRules,
  children,
  footer,
  wide = false,
}) {
  return (
    <div className="bp-app bp-flow">
      <div className="bp-flow__top">
        <LangToggle />
      </div>
      <main className={`bp-main bp-flow__main${wide ? ' bp-main--dashboard' : ''}`}>
        <div className={`bp-flow-card${wide ? ' bp-flow-card--dashboard' : ''}`}>
          <ApiStatusBanner compact />
          {onBack && <BackButton onClick={onBack} />}
          <header className="bp-flow-header">
            <h1 className="bp-flow-header__title">{title}</h1>
            {subtitle && <p className="bp-flow-header__sub">{subtitle}</p>}
          </header>
          <div className="bp-flow-body">{children}</div>
          {footer && <div className="bp-flow-footer">{footer}</div>}
        </div>
        {(onHome || onRules) && (
          <div className="bp-flow__bottom-nav">
            <AppNavActions onHome={onHome} onRules={onRules} className="bp-nav-actions--flow" />
          </div>
        )}
      </main>
    </div>
  );
}
