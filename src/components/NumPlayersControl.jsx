import { MIN_PLAYERS, MAX_PLAYERS } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';
import NumberStepper from './NumberStepper';

export default function NumPlayersControl({ value, onChange, disabled = false, compact = false }) {
  const { tr } = useLocale();

  return (
    <NumberStepper
      id="num-players"
      label={tr('numPlayers')}
      hint={tr('numPlayersHint', { min: MIN_PLAYERS, max: MAX_PLAYERS })}
      value={value}
      onChange={onChange}
      min={MIN_PLAYERS}
      max={MAX_PLAYERS}
      disabled={disabled}
      compact={compact}
    />
  );
}
