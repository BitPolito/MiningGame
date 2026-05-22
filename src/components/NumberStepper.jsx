import { useLocale } from '../i18n/LocaleContext';

export default function NumberStepper({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  disabled = false,
  compact = false,
}) {
  const { tr } = useLocale();
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={`bp-field bp-stepper-field${compact ? ' bp-stepper-field--compact' : ''}`}>
      <div className="bp-stepper-field__head">
        {label && (
          <label className="bp-label" htmlFor={id} title={compact && hint ? hint : undefined}>
            {label}
          </label>
        )}
        {hint && !compact && <p className="bp-hint bp-stepper-field__hint">{hint}</p>}
      </div>

      <div className="bp-stepper" id={id}>
        <button
          type="button"
          className="bp-stepper__btn bp-stepper__btn--minus"
          onClick={() => !atMin && !disabled && onChange(value - 1)}
          disabled={disabled || atMin}
          aria-label={tr('stepperDecrease')}
        >
          <span className="bp-stepper__glyph" aria-hidden>
            −
          </span>
        </button>

        <div className="bp-stepper__display" aria-live="polite" aria-atomic="true">
          <span className="bp-stepper__value">{value}</span>
        </div>

        <button
          type="button"
          className="bp-stepper__btn bp-stepper__btn--plus"
          onClick={() => !atMax && !disabled && onChange(value + 1)}
          disabled={disabled || atMax}
          aria-label={tr('stepperIncrease')}
        >
          <span className="bp-stepper__glyph" aria-hidden>
            +
          </span>
        </button>
      </div>
    </div>
  );
}
