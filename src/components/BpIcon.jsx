/**
 * Single-color SVG via CSS mask — size on wrapper, glyph fills it (stable alignment).
 */
/** @param {'inherit' | 'primary' | 'tile' | 'on-solid'} tone */
export default function BpIcon({ src, className = 'bp-icon', label, tone = 'inherit' }) {
  const style = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
  };

  const toneClass =
    tone === 'primary'
      ? ' bp-icon-wrap--primary'
      : tone === 'tile'
        ? ' bp-icon-wrap--tile'
        : tone === 'on-solid'
          ? ' bp-icon-wrap--on-solid'
          : '';

  const glyph = (
    <span
      className={`bp-icon-wrap ${className}${toneClass}`.trim()}
      aria-hidden={!!label}
    >
      <span className="bp-icon-mask" style={style} />
    </span>
  );

  if (label) {
    return (
      <span className="bp-icon-labeled" role="img" aria-label={label}>
        {glyph}
      </span>
    );
  }

  return glyph;
}
