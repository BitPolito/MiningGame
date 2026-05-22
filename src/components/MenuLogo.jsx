import { useLocale } from '../i18n/LocaleContext';

/** Original game title artwork — Frame 2 + handwrite overlay. */
export default function MenuLogo({ className = '' }) {
  const { tr } = useLocale();

  return (
    <div className={`title-container ${className}`.trim()}>
      <img src="/Frame 2.svg" alt={tr('titleAlt')} className="menu-title" />
      <img src="/handwrite.png" alt="" className="handwrite-img" />
    </div>
  );
}
