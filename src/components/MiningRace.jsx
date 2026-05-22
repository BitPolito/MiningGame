import PanelCard from './PanelCard';
import { ICON } from '../assets/icons';
import { getRoomBlocksToWin } from '../lib/roomConfig';
import { useLocale } from '../i18n/LocaleContext';

export default function MiningRace({ roomData, playerName }) {
  const { tr } = useLocale();
  if (!roomData?.players?.length) return null;

  const goal = getRoomBlocksToWin(roomData);

  return (
    <PanelCard title={tr('miningRace')} iconSrc={ICON.crown}>
      {roomData.players.map((p) => {
        const pct = Math.min(100, (p.blocks / goal) * 100);
        const won = p.blocks >= goal;
        return (
          <div key={p.name} className="bp-race-row">
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              {p.name}
              {p.name === playerName && (
                <span style={{ opacity: 0.7, marginLeft: 4 }}>({tr('you')})</span>
              )}
            </span>
            <div className="bp-race-bar">
              <div
                className={`bp-race-bar__fill${won ? ' bp-race-bar__fill--won' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
              {p.blocks}/{goal}
            </span>
          </div>
        );
      })}
    </PanelCard>
  );
}
