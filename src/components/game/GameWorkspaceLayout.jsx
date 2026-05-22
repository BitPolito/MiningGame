import GamePinnedChain from './GamePinnedChain';
import { GameTabBar, GameTabPanels } from './GameSectionTabs';
import MiningRace from '../MiningRace';

export default function GameWorkspaceLayout({
  columns,
  minedCount,
  blocksMined,
  blockGoal,
  onBlockClick,
  chainClickable = false,
  roomData,
  playerName,
  showRace = false,
  gameTab,
  onGameTabChange,
  tabs,
  panels,
}) {
  const hasRace = showRace && (roomData?.players?.length ?? 0) > 0;
  const showTabs = tabs.length > 1;

  return (
    <div className={`bp-game-workspace${showTabs ? '' : ' bp-game-workspace--solo-tab'}`}>
      <div className="bp-game-sticky-zone">
        <GamePinnedChain
          columns={columns}
          minedCount={minedCount}
          blocksMined={blocksMined}
          blockGoal={blockGoal}
          onBlockClick={onBlockClick}
          clickable={chainClickable}
        />
        {showTabs ? (
          <GameTabBar value={gameTab} onChange={onGameTabChange} tabs={tabs} />
        ) : null}
      </div>

      <div className={`bp-game-workspace__body${hasRace ? '' : ' bp-game-workspace__body--solo'}`}>
        <div className="bp-game-workspace__main">
          <GameTabPanels value={gameTab} tabs={tabs} panels={panels} />
        </div>
        {hasRace && (
          <aside className="bp-game-workspace__aside">
            <MiningRace roomData={roomData} playerName={playerName} />
          </aside>
        )}
      </div>
    </div>
  );
}
