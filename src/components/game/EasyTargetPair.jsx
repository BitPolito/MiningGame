import { useLocale } from '../../i18n/LocaleContext';

export default function EasyTargetPair({ previousTarget, target, compact = false }) {
  const { tr } = useLocale();
  return (
    <dl className={`bp-easy-targets${compact ? ' bp-easy-targets--compact' : ''}`}>
      <div>
        <dt>{tr('prevBlockTarget')}</dt>
        <dd>{previousTarget}</dd>
      </div>
      <div>
        <dt>{tr('blockTarget')}</dt>
        <dd>{target}</dd>
      </div>
    </dl>
  );
}
