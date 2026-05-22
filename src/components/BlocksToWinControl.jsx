import { MIN_BLOCKS_TO_WIN, MAX_BLOCKS_TO_WIN } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';
import NumberStepper from './NumberStepper';

export default function BlocksToWinControl({ value, onChange, disabled = false, compact = false }) {
  const { tr } = useLocale();

  return (
    <NumberStepper
      id="blocks-to-win"
      label={tr('blocksToWin')}
      hint={tr('blocksToWinHint', { min: MIN_BLOCKS_TO_WIN, max: MAX_BLOCKS_TO_WIN })}
      value={value}
      onChange={onChange}
      min={MIN_BLOCKS_TO_WIN}
      max={MAX_BLOCKS_TO_WIN}
      disabled={disabled}
      compact={compact}
    />
  );
}
