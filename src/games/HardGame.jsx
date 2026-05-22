import { useState, useEffect, useMemo, useCallback } from 'react';
import HowToPlay from '../HowToPlay';
import ModalCloseButton from '../components/ModalCloseButton';
import GameHud from '../components/game/GameHud';
import WinOverlay from '../components/WinOverlay';
import PowFoundOverlay from '../components/PowFoundOverlay';
import PowDicePanel from '../components/game/PowDicePanel';
import { emptyDiceFaces, nonceFromDiceRoll } from '../lib/powDice';
import GameToast from '../components/GameToast';
import PanelCard from '../components/PanelCard';
import MempoolTable from '../components/game/MempoolTable';
import MempoolRulesPanel from '../components/game/MempoolRulesPanel';
import BalanceSheetTable from '../components/game/BalanceSheetTable';
import LiveVerifierPanel from '../components/game/LiveVerifierPanel';
import CollapsibleSection from '../components/game/CollapsibleSection';
import GameWorkspaceLayout from '../components/game/GameWorkspaceLayout';
import PanelSection from '../components/game/PanelSection';
import BpIcon from '../components/BpIcon';
import { ICON } from '../assets/icons';
import { canSelectTransaction, getRejectReasonKey } from '../lib/txSelection';
import { generateMempool, replenishMempool, stabilizeBalances } from '../lib/mempool';
import { generateTargetHash, isProofOfWorkValid, LEADING_ZEROS } from '../lib/targetHash';
import { sha256Hex } from '../lib/sha256';
import { initialBalances } from '../lib/gameConstants';
import {
  getBlockColumns,
  getRoomBlocksToWin,
  clampBlocksToWin,
  pickNewerRoom,
} from '../lib/roomConfig';
import { reportMine } from '../lib/roomApi';
import { normalizePlayerName } from '../lib/playerNames';
import { useLocale } from '../i18n/LocaleContext';
import { useRoomPoll } from '../hooks/useRoomPoll';
import { useSha256 } from '../hooks/useSha256';

export default function HardGame({
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
  const [mempool, setMempool] = useState(() =>
    generateMempool({
      balances: initialBalances(),
      blockNum: 1,
      roomSeed: gameSeed,
      requireVariance: false,
      txDate: '-2026/05',
    }),
  );
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [gameTab, setGameTab] = useState('play');
  const [targetHash, setTargetHash] = useState(() => generateTargetHash(gameSeed, 1));
  const [blockNum, setBlockNum] = useState(1);

  const [nonce, setNonce] = useState(0);
  const [finalHash, setFinalHash] = useState('');
  const [miningDone, setMiningDone] = useState(false);
  const [hasAcknowledgedPow, setHasAcknowledgedPow] = useState(false);
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState(emptyDiceFaces);
  const [rollCount, setRollCount] = useState(0);
  const [messageKey, setMessageKey] = useState(null);
  const [lastMinedBlockId, setLastMinedBlockId] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [rulesGuideMode, setRulesGuideMode] = useState('hard');

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
    () =>
      clampBlocksToWin(
        roomSeed ? getRoomBlocksToWin(effectiveRoom) : blocksToWinProp,
      ),
    [roomSeed, effectiveRoom, blocksToWinProp],
  );

  const myRoomPlayer = useMemo(() => {
    if (!effectiveRoom?.players?.length || !playerName) return null;
    const key = normalizePlayerName(playerName);
    return effectiveRoom.players.find((p) => normalizePlayerName(p.name) === key) ?? null;
  }, [effectiveRoom, playerName]);

  const blocksMinedLive = roomSeed
    ? (myRoomPlayer?.blocks ?? 0)
    : Math.max(0, blocks.length - 1);
  const columns = useMemo(() => getBlockColumns(blocksToWinLive), [blocksToWinLive]);

  const [soloWon, setSoloWon] = useState(false);
  const gameOver = soloWon || effectiveRoom?.status === 'finished';
  const selectedTxs = useMemo(
    () => mempool.filter((tx) => selectedTxIds.includes(tx.id)),
    [mempool, selectedTxIds],
  );

  const baseString = useMemo(() => {
    if (selectedTxs.length !== 3) return '';
    return selectedTxs
      .map((tx) => `${tx.sender}to${tx.receiver}${tx.amount}${tx.date}`)
      .join('-');
  }, [selectedTxs]);

  const txHash = useSha256(baseString);

  useEffect(() => {
    if (selectedTxIds.length !== 3) {
      setNonce(0);
      setFinalHash('');
      setMiningDone(false);
      setHasAcknowledgedPow(false);
      setRollingDice(false);
      setDiceFaces(emptyDiceFaces());
      setRollCount(0);
    }
  }, [selectedTxIds.length]);

  useEffect(() => {
    if (!gameOver) return;
    setMiningDone(false);
    setHasAcknowledgedPow(false);
    setFinalHash('');
    setRollingDice(false);
  }, [gameOver]);

  const currentBalances = balanceHistory[balanceHistory.length - 1];

  const syncRoomFromServer = useCallback(
    (room) => {
      if (room) setRoomData((prev) => pickNewerRoom(prev, room));
    },
    [setRoomData],
  );

  const commitBlock = async (blockNonce) => {
    if (gameOver || selectedTxIds.length !== 3) return;

    const lastBalances = { ...balanceHistory[balanceHistory.length - 1] };
    selectedTxs.forEach((tx) => {
      lastBalances[tx.sender] -= tx.amount + tx.fee;
      lastBalances[tx.receiver] += tx.amount;
    });
    const stabilized = stabilizeBalances(lastBalances);
    const newBlockId = blocks.length;

    setBalanceHistory([...balanceHistory, stabilized]);
    setBlocks([
      ...blocks,
      {
        id: newBlockId,
        nonce: blockNonce,
        dateMined: new Date().toLocaleString(),
        transactions: [...selectedTxs],
      },
    ]);

    const nextBlock = blockNum + 1;
    setBlockNum(nextBlock);
    setMempool(
      replenishMempool(
        mempool.filter((tx) => !selectedTxIds.includes(tx.id)),
        stabilized,
        nextBlock,
        gameSeed,
      ),
    );
    setTargetHash(generateTargetHash(gameSeed, nextBlock));
    setSelectedTxIds([]);
    setNonce(0);
    setFinalHash('');
    setMiningDone(false);
    setHasAcknowledgedPow(false);
    setLastMinedBlockId(newBlockId);
    setMessageKey('blockMinedHard');

    if (roomSeed) {
      const blockIndex = (myRoomPlayer?.blocks ?? 0) + 1;
      const result = await reportMine(roomSeed, playerName, blockIndex);
      if (result?.room) {
        syncRoomFromServer(result.room);
      } else {
        setMessageKey('errConnect');
      }
    } else if (newBlockId >= blocksToWinLive) {
      setSoloWon(true);
    }
  };

  const handleMineBlock = () => {
    if (!miningDone || !finalHash || gameOver) return;
    void commitBlock(nonce);
  };

  const rollDiceForPow = async () => {
    if (!txHash || !targetHash || gameOver || rollingDice || miningDone) return;

    setRollingDice(true);
    setMessageKey(null);
    const nextRoll = rollCount + 1;
    try {
      await new Promise((r) => setTimeout(r, 420));
      const { dice, nonce: rolledNonce } = nonceFromDiceRoll(nextRoll);
      const hash = await sha256Hex(txHash + rolledNonce);
      const valid = isProofOfWorkValid(hash, targetHash);
      setRollCount(nextRoll);
      setDiceFaces(dice);
      setNonce(rolledNonce);
      setFinalHash(hash);
      setMiningDone(valid);
      setHasAcknowledgedPow(false);
      setMessageKey(valid ? 'powHashValid' : 'powHashInvalid');
    } finally {
      setRollingDice(false);
    }
  };

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

  const canRollDice = selectedTxIds.length === 3 && !!txHash && !gameOver && !miningDone;
  const powFound = miningDone && !!finalHash;
  const toastMessage =
    messageKey === 'blockMinedHard' && lastMinedBlockId != null
      ? tr('blockMinedHard', { n: lastMinedBlockId })
      : messageKey
        ? tr(messageKey)
        : '';
  const toastVariant =
    !messageKey ||
    messageKey === 'blockMinedHard' || messageKey === 'powHashValid'
      ? 'ok'
      : 'err';

  const targetShort =
    targetHash && targetHash.length > 12
      ? `${targetHash.slice(0, 8)}…${targetHash.slice(-4)}`
      : targetHash || tr('targetPending');

  return (
    <div className="bp-app">
      <main className="bp-main bp-main--wide">
        <div className="bp-game">
          <GameHud
            onHome={onHome}
            onHelp={() => {
              setRulesGuideMode('hard');
              setShowHowToPlay(true);
            }}
            difficulty="hard"
            blocksMined={blocksMinedLive}
            blockGoal={blocksToWinLive}
            roomSeed={roomSeed}
            selectionCount={selectedTxIds.length}
            stats={[
              {
                label: tr('blockTarget'),
                value: targetShort,
                mono: true,
                wide: true,
                title: targetHash,
              },
            ]}
          />

          <PowFoundOverlay
            open={powFound && !hasAcknowledgedPow && !gameOver}
            nonce={nonce}
            diceFaces={diceFaces}
            finalHash={finalHash}
            onClose={() => setHasAcknowledgedPow(true)}
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
            minedCount={roomSeed ? blocksMinedLive + 1 : blocks.length}
            blocksMined={blocksMinedLive}
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
                      title={tr('selectedTxHard')}
                      iconSrc={ICON.save}
                      compact
                      active={selectedTxIds.length === 3}
                      bodyClassName="bp-panel__body--flush"
                    >
                      <MempoolTable
                        transactions={selectedTxs}
                        selectedIds={selectedTxIds}
                        showUserIcons={false}
                        emptyMessage={tr('noTxSelected')}
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
                      <p className="bp-hint bp-hint--compact">{tr('mempoolHintShort')}</p>
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
                      showUserIcons={false}
                    />
                    <div className="bp-mempool-foot">
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
                    title={tr('miningController')}
                    iconSrc={ICON.pickaxe}
                    active={powFound || selectedTxIds.length === 3}
                    bodyClassName="bp-panel__body--sections"
                  >
                    <PanelSection variant="status">
                      <div className={`bp-status${rollingDice ? ' bp-status--mining' : ''}`}>
                        {rollingDice && <span className="bp-spinner" />}
                        {rollingDice
                          ? tr('powRolling')
                          : powFound
                            ? tr('miningReady')
                            : canRollDice
                              ? tr('powDiceHint')
                              : tr('miningNeedTx')}
                      </div>
                      <p className="bp-hint">{tr('powTargetHint', { zeros: LEADING_ZEROS })}</p>
                    </PanelSection>

                    {txHash && (
                      <PanelSection title={tr('txHash')} variant="mono">
                        <div className="bp-hash bp-hash--compact">{txHash}</div>
                      </PanelSection>
                    )}

                    {baseString && (
                      <PanelSection title={tr('rawTxData')} variant="mono">
                        <div className="bp-hash bp-hash--compact" style={{ wordBreak: 'break-all', fontSize: '0.8em', color: 'var(--text-dim)' }}>
                          {baseString}
                        </div>
                      </PanelSection>
                    )}

                    {(canRollDice || powFound) && (
                      <PanelSection title={tr('rollDice')} variant="action">
                        <PowDicePanel
                          diceFaces={diceFaces}
                          rollCount={rollCount}
                          nonce={nonce}
                          rolling={rollingDice}
                          disabled={!canRollDice}
                          powFound={powFound}
                          onRoll={rollDiceForPow}
                        />
                      </PanelSection>
                    )}

                    {finalHash && (
                      <PanelSection title={tr('hashResult')} variant="mono">
                        <div className={`bp-hash bp-hash--result${powFound ? ' bp-hash--win' : ''}`}>
                          {finalHash}
                        </div>
                      </PanelSection>
                    )}

                    {powFound && hasAcknowledgedPow && !gameOver && (
                      <PanelSection variant="action">
                        <button type="button" className="bp-btn bp-btn-solid bp-btn--block bp-btn--pulse" onClick={handleMineBlock}>
                          <BpIcon src={ICON.pickaxe} className="bp-icon" tone="on-solid" />
                          <span className="bp-btn__label">{tr('mineBlock')}</span>
                        </button>
                      </PanelSection>
                    )}
                  </PanelCard>

                  <CollapsibleSection
                    title={tr('liveVerifier')}
                    iconSrc={ICON.microscope}
                    defaultOpen={false}
                  >
                    <LiveVerifierPanel />
                  </CollapsibleSection>
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
