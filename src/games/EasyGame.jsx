import { useState, useMemo, useCallback } from 'react';
import HowToPlay from '../HowToPlay';
import ModalCloseButton from '../components/ModalCloseButton';
import GameHud from '../components/game/GameHud';
import WinOverlay from '../components/WinOverlay';
import GameToast from '../components/GameToast';
import PanelCard from '../components/PanelCard';
import MempoolTable from '../components/game/MempoolTable';
import MempoolNameGuide from '../components/game/MempoolNameGuide';
import BalanceSheetTable from '../components/game/BalanceSheetTable';
import MempoolRulesPanel from '../components/game/MempoolRulesPanel';
import CollapsibleSection from '../components/game/CollapsibleSection';
import GameWorkspaceLayout from '../components/game/GameWorkspaceLayout';
import PanelSection from '../components/game/PanelSection';
import EasyFormulaPanel from '../components/game/EasyFormulaPanel';
import BpIcon from '../components/BpIcon';
import { ICON } from '../assets/icons';
import { canSelectTransaction, getRejectReasonKey } from '../lib/txSelection';
import { generateMempool, stabilizeBalances } from '../lib/mempool';
import {
  computeBlockValue,
  initialEasyTarget,
  nextEasyTarget,
} from '../lib/easyMining';
import { initialBalances } from '../lib/gameConstants';
import {
  getBlockColumns,
  getRoomBlocksToWin,
  clampBlocksToWin,
  pickNewerRoom,
} from '../lib/roomConfig';
import { reportMine } from '../lib/roomApi';
import { useLocale } from '../i18n/LocaleContext';
import { useRoomPoll } from '../hooks/useRoomPoll';

export default function EasyGame({
  onHome,
  onViewResults,
  roomSeed = '',
  playerName = '',
  initialRoomData = null,
  blocksToWin: blocksToWinProp = 3,
}) {
  const { tr } = useLocale();
  const [gameSeed] = useState(() => roomSeed || Math.random().toString(36).substring(2, 10));

  const [balanceHistory, setBalanceHistory] = useState([initialBalances()]);
  const [blockNum, setBlockNum] = useState(1);
  const [prevTarget, setPrevTarget] = useState(0);
  const [target, setTarget] = useState(() => initialEasyTarget());
  const [mempool, setMempool] = useState(() =>
    generateMempool({ balances: initialBalances(), blockNum: 1, roomSeed: gameSeed }),
  );
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [gameTab, setGameTab] = useState('play');
  const [nonceInput, setNonceInput] = useState('');
  const [messageKey, setMessageKey] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [rulesGuideMode, setRulesGuideMode] = useState('easy');

  const [blocks, setBlocks] = useState([
    { id: 0, nonce: 0, dateMined: new Date().toLocaleString(), transactions: [] },
  ]);
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [roomData, setRoomData] = useRoomPoll(
    roomSeed,
    !!roomSeed,
    'game',
    initialRoomData,
  );
  const effectiveRoom = useMemo(
    () => pickNewerRoom(roomData, initialRoomData),
    [roomData, initialRoomData],
  );

  const blocksToWinLive = useMemo(
    () => clampBlocksToWin(roomSeed ? getRoomBlocksToWin(effectiveRoom) : blocksToWinProp),
    [roomSeed, effectiveRoom, blocksToWinProp],
  );
  const columns = useMemo(() => getBlockColumns(blocksToWinLive), [blocksToWinLive]);

  const [soloWon, setSoloWon] = useState(false);
  const gameOver = soloWon || effectiveRoom?.status === 'finished';

  const currentBalances = balanceHistory[balanceHistory.length - 1];

  const selectedTxs = useMemo(
    () => mempool.filter((tx) => selectedTxIds.includes(tx.id)),
    [mempool, selectedTxIds],
  );

  const toastMessage = messageKey ? tr(messageKey) : '';
  const toastVariant = !messageKey || messageKey === 'blockMinedOk' ? 'ok' : 'err';

  const toggleSelection = (id) => {
    if (gameOver) return;
    setMessageKey(null);

    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((txId) => txId !== id));
      return;
    }

    if (selectedTxIds.length >= 3) {
      setMessageKey('errSelect3');
      return;
    }

    if (canSelectTransaction(id, mempool, selectedTxIds, currentBalances)) {
      setSelectedTxIds([...selectedTxIds, id]);
      return;
    }

    setMessageKey(getRejectReasonKey(id, mempool, selectedTxIds, currentBalances));
  };

  const syncRoomFromServer = useCallback(
    (room) => {
      if (room) setRoomData((prev) => pickNewerRoom(prev, room));
    },
    [setRoomData],
  );

  const handleMine = async () => {
    if (gameOver) return;
    if (selectedTxIds.length !== 3) {
      setMessageKey('errSelect3');
      return;
    }

    const blockValue = computeBlockValue(selectedTxs);
    const parsedNonce = parseInt(nonceInput, 10);
    if (Number.isNaN(parsedNonce) || parsedNonce <= 0) {
      setMessageKey('errNoncePositive');
      return;
    }
    if (prevTarget + parsedNonce + blockValue !== target) {
      setMessageKey('errNonceWrong');
      return;
    }

    const newBalances = { ...currentBalances };
    selectedTxs.forEach((tx) => {
      newBalances[tx.sender] -= tx.amount + tx.fee;
      newBalances[tx.receiver] += tx.amount;
    });
    const stabilized = stabilizeBalances(newBalances);

    const newBlockId = blocks.length;
    setBlocks([
      ...blocks,
      {
        id: newBlockId,
        nonce: parsedNonce,
        dateMined: new Date().toLocaleString(),
        transactions: [...selectedTxs],
      },
    ]);

    const nextBlock = blockNum + 1;
    setBalanceHistory([...balanceHistory, stabilized]);
    setBlockNum(nextBlock);
    setPrevTarget(target);
    setTarget(nextEasyTarget(target, nextBlock, gameSeed));
    setMempool(
      generateMempool({ balances: stabilized, blockNum: nextBlock, roomSeed: gameSeed }),
    );
    setSelectedTxIds([]);
    setNonceInput('');
    setMessageKey('blockMinedOk');

    if (roomSeed) {
      const result = await reportMine(roomSeed, playerName, nextBlock - 1);
      if (result?.room) syncRoomFromServer(result.room);
      else if (!result?.success) setMessageKey('errConnect');
    } else if (nextBlock > blocksToWinLive) {
      setSoloWon(true);
    }
  };

  return (
    <div className="bp-app">
      <main className="bp-main bp-main--wide">
        <div className="bp-game">
          <GameHud
            onHome={onHome}
            onHelp={() => {
              setRulesGuideMode('easy');
              setShowHowToPlay(true);
            }}
            difficulty="easy"
            blocksMined={Math.max(0, blockNum - 1)}
            blockGoal={blocksToWinLive}
            roomSeed={roomSeed}
            selectionCount={selectedTxIds.length}
            stats={[
              { label: tr('blockTarget'), value: target },
              { label: tr('prevBlockTarget'), value: prevTarget },
            ]}
          />

          <WinOverlay
            roomData={effectiveRoom}
            playerName={playerName}
            onHome={onHome}
            onViewResults={onViewResults}
            soloWin={soloWon}
            blocksToWin={blocksToWinLive}
          />

          <GameWorkspaceLayout
            columns={columns}
            minedCount={blockNum}
            blocksMined={Math.max(0, blockNum - 1)}
            blockGoal={blocksToWinLive}
            onBlockClick={(i) => blocks[i] && setSelectedBlock(blocks[i])}
            chainClickable
            roomData={effectiveRoom}
            playerName={playerName}
            showRace={!!roomSeed}
            gameTab={gameTab}
            onGameTabChange={setGameTab}
            tabs={[
              {
                id: 'play',
                label: tr('gameTabPlay'),
                iconSrc: ICON.pickaxe,
                badge: `${selectedTxIds.length}/3`,
              },
            ]}
            panels={{
              play: (
                <div className="bp-game-play-stack">
                  {selectedTxIds.length > 0 && (
                    <PanelCard
                      title={tr('selectedTx')}
                      iconSrc={ICON.save}
                      compact
                      active={selectedTxIds.length === 3}
                      bodyClassName="bp-panel__body--flush"
                    >
                      <MempoolTable
                        transactions={selectedTxs}
                        selectedIds={selectedTxIds}
                        emptyMessage={tr('noTxSelected')}
                        inlineNameValues
                      />
                    </PanelCard>
                  )}
                  <PanelCard
                    className="bp-panel--mempool-full"
                    title={tr('mempool')}
                    iconSrc={ICON.wallet}
                    bodyClassName="bp-panel__body--flush"
                  >
                    <div className="bp-mempool-intro">
                      <p className="bp-hint bp-hint--compact">{tr('mempoolHintEasyShort')}</p>
                      <CollapsibleSection
                        title={tr('mempoolRulesTitle')}
                        iconSrc={ICON.info}
                        defaultOpen={false}
                      >
                        <MempoolRulesPanel variant="compact" />
                      </CollapsibleSection>
                    </div>
                    <MempoolTable
                      transactions={mempool}
                      selectedIds={selectedTxIds}
                      onToggle={toggleSelection}
                      disabled={gameOver}
                    />
                    <div className="bp-mempool-foot">
                      <CollapsibleSection
                        title={tr('nameGuide')}
                        iconSrc={ICON.info}
                        defaultOpen={false}
                      >
                        <MempoolNameGuide />
                      </CollapsibleSection>
                      <CollapsibleSection
                        title={tr('balanceSheet')}
                        iconSrc={ICON.coin}
                        defaultOpen={false}
                      >
                        <BalanceSheetTable columns={columns} balanceHistory={balanceHistory} />
                      </CollapsibleSection>
                    </div>
                  </PanelCard>
                  <PanelCard
                    title={tr('mineBlock')}
                    iconSrc={ICON.pickaxe}
                    active
                    bodyClassName="bp-panel__body--sections"
                  >
                    <PanelSection variant="mine">
                      <EasyFormulaPanel />
                      <div className="bp-mining-toolbar">
                        <label className="bp-mining-toolbar__field" htmlFor="nonce-easy">
                          <span className="bp-mining-toolbar__label">{tr('nonce')}</span>
                          <input
                            id="nonce-easy"
                            className="bp-mining-toolbar__input"
                            type="text"
                            inputMode="numeric"
                            placeholder="?"
                            value={nonceInput}
                            onChange={(e) => setNonceInput(e.target.value)}
                            disabled={gameOver}
                            autoComplete="off"
                          />
                        </label>
                        <button
                          type="button"
                          className="bp-btn bp-btn-solid bp-mining-toolbar__btn"
                          onClick={handleMine}
                          disabled={selectedTxIds.length !== 3 || gameOver}
                        >
                          <BpIcon src={ICON.pickaxe} className="bp-icon--sm" tone="on-solid" />
                          <span className="bp-btn__label">{tr('mineBlock')}</span>
                        </button>
                      </div>
                    </PanelSection>
                  </PanelCard>
                </div>
              ),
                }}
          />
        </div>
      </main>

      <GameToast
        message={toastMessage}
        variant={toastVariant}
        onDismiss={() => setMessageKey(null)}
      />

      {selectedBlock && (
        <div className="modal-overlay" onClick={() => setSelectedBlock(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{tr('blockDetails', { n: selectedBlock.id })}</h3>
              <ModalCloseButton onClick={() => setSelectedBlock(null)} />
            </div>
            <div className="modal-body">
              <p>
                <strong>{tr('nonce')}:</strong> {selectedBlock.nonce}
              </p>
              <p>
                <strong>{tr('minedOn')}:</strong> {selectedBlock.dateMined}
              </p>
              {selectedBlock.transactions.length > 0 ? (
                <MempoolTable
                  transactions={selectedBlock.transactions}
                  showUserIcons={false}
                  showNameValues={false}
                />
              ) : (
                <p>{tr('genesisBlock')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showHowToPlay && (
        <HowToPlay
          key={rulesGuideMode}
          initialDifficulty={rulesGuideMode}
          onClose={() => setShowHowToPlay(false)}
        />
      )}
    </div>
  );
}
