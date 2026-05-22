import BlockchainStrip from '../BlockchainStrip';
import BpIcon from '../BpIcon';
import { ICON } from '../../assets/icons';
import { useLocale } from '../../i18n/LocaleContext';

export default function GamePinnedChain({
  columns,
  minedCount,
  blocksMined = 0,
  blockGoal = 1,
  onBlockClick,
  clickable = false,
}) {
  const { tr } = useLocale();

  return (
    <div className="bp-game-pinboard" aria-label={tr('blockchain')}>
      <div className="bp-game-pinboard__head">
        <BpIcon src={ICON.bitlogo} className="bp-icon--sm" tone="primary" />
        <span className="bp-game-pinboard__title">{tr('blockchain')}</span>
        <span className="bp-game-pinboard__progress">
          {tr('blockProgress', {
            current: Math.min(blocksMined, blockGoal),
            goal: blockGoal,
          })}
        </span>
      </div>
      <BlockchainStrip
        columns={columns}
        minedCount={minedCount}
        onBlockClick={onBlockClick}
        clickable={clickable}
      />
    </div>
  );
}
