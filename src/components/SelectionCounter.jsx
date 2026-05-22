export default function SelectionCounter({ count, variant = 'panel' }) {
  const ready = count === 3;

  return (
    <div
      className={[
        'bp-selection',
        ready ? ' bp-selection--ready' : '',
        variant === 'hud' ? ' bp-selection--hud' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`bp-selection__dot${i < count ? ' bp-selection__dot--on' : ''}`}
        />
      ))}
      <span>
        {count}/3 {ready && '✓'}
      </span>
    </div>
  );
}
