import DifficultyPicker from './DifficultyPicker';
import BlocksToWinControl from './BlocksToWinControl';
import { useLocale } from '../i18n/LocaleContext';

export default function GameSetupPanel({
  difficulty,
  onDifficultyChange,
  blocksToWin,
  onBlocksToWinChange,
  title,
  hint,
  compact = false,
  embedded = false,
  showTitle = true,
}) {
  const { tr } = useLocale();

  return (
    <div
      className={[
        'bp-setup-panel',
        compact ? 'bp-setup-panel--compact' : '',
        embedded ? 'bp-setup-panel--embedded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showTitle && (
        <p className="bp-setup-panel__title">{title ?? tr('gameSettings')}</p>
      )}
      {hint && <p className={`bp-setup-panel__hint${compact ? ' bp-setup-panel__hint--compact' : ''}`}>{hint}</p>}

      <div className="bp-setup-panel__grid">
        <div className="bp-setup-panel__field">
          <span className="bp-label bp-label--inline">{tr('difficultyLabel')}</span>
          <DifficultyPicker value={difficulty} onChange={onDifficultyChange} compact />
        </div>
        <BlocksToWinControl
          value={blocksToWin}
          onChange={onBlocksToWinChange}
          compact={compact}
        />
      </div>
    </div>
  );
}
