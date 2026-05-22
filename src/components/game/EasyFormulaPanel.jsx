import { useLocale } from '../../i18n/LocaleContext';

/** Reference only — player computes block value and nonce manually. */
export default function EasyFormulaPanel() {
  const { tr } = useLocale();

  return (
    <div className="easy-formula-panel">
      <p className="easy-formula-panel__title">{tr('easyFormulaTitle')}</p>
      <div className="easy-formula-panel__eq">
        <span className="easy-formula-panel__part">{tr('prevBlockTarget')}</span>
        <span className="easy-formula-panel__op">+</span>
        <span className="easy-formula-panel__part">{tr('nonce')}</span>
        <span className="easy-formula-panel__op">+</span>
        <span className="easy-formula-panel__part easy-formula-panel__part--emph">
          {tr('blockValueLabel')}
        </span>
        <span className="easy-formula-panel__op">=</span>
        <span className="easy-formula-panel__part">{tr('blockTarget')}</span>
      </div>
      <p className="easy-formula-panel__hint">{tr('blockValueFormula')}</p>
    </div>
  );
}
