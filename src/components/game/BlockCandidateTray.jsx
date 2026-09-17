import { useLocale } from '../../i18n/LocaleContext';

export default function BlockCandidateTray({ transactions, feeTotal, onRemove, compact = false }) {
  const { tr } = useLocale();
  const slots = Array.from({ length: 3 }, (_, index) => transactions[index] ?? null);

  return (
    <div className={`bp-candidate-tray${compact ? ' bp-candidate-tray--compact' : ''}`}>
      <div className="bp-candidate-tray__slots" aria-label={tr('candidateSlots')}>
        {slots.map((tx, index) => (
          tx ? (
            <button
              key={tx.id}
              type="button"
              className="bp-candidate-slot bp-candidate-slot--filled"
              onClick={onRemove ? () => onRemove(tx.id) : undefined}
              disabled={!onRemove}
              aria-label={tr('removeCandidateTx', { id: tx.displayId ?? tx.id })}
            >
              <span className="bp-candidate-slot__id">#{tx.displayId ?? tx.id}</span>
              <span className="bp-candidate-slot__fee">+{tx.fee}</span>
            </button>
          ) : (
            <span
              key={`empty-${index}`}
              className="bp-candidate-slot bp-candidate-slot--empty"
              aria-label={tr('candidateSlotEmpty', { n: index + 1 })}
            >
              {index + 1}
            </span>
          )
        ))}
      </div>
      <span className="bp-candidate-tray__fees">{tr('selectedFeesShort', { fees: feeTotal })}</span>
    </div>
  );
}
