import { useState, useEffect, useMemo, useCallback } from 'react';
import HowToPlay from '../HowToPlay';
import ModalCloseButton from '../components/ModalCloseButton';
import GameHud from '../components/game/GameHud';
import WinOverlay from '../components/WinOverlay';
import PowFoundOverlay from '../components/PowFoundOverlay';
import PowDicePanel from '../components/game/PowDicePanel';
import { emptyDiceFaces, formatPowNonce, nonceFromDiceRoll } from '../lib/powDice';
import GameToast from '../components/GameToast';
import PanelCard from '../components/PanelCard';
import MempoolTable from '../components/game/MempoolTable';
import MempoolRulesPanel from '../components/game/MempoolRulesPanel';
import BalanceSheetTable from '../components/game/BalanceSheetTable';
import LiveVerifierPanel from '../components/game/LiveVerifierPanel';
import CollapsibleSection from '../components/game/CollapsibleSection';
import GameWorkspaceLayout from '../components/game/GameWorkspaceLayout';
import GamePinnedChain from '../components/game/GamePinnedChain';
import PanelSection from '../components/game/PanelSection';
import MiningPhaseIndicator from '../components/game/MiningPhaseIndicator';
import BlockCandidateTray from '../components/game/BlockCandidateTray';
import MobileMiningDock from '../components/game/MobileMiningDock';
import BlockDetailsContent from '../components/game/BlockDetailsContent';
import ShakeToMineControl from '../components/game/ShakeToMineControl';
import BpIcon from '../components/BpIcon';
import { ICON } from '../assets/icons';
import { canSelectTransaction, getRejectReasonKey, getTransactionsInSelectionOrder } from '../lib/txSelection';
import {
  computeHardBlockHash,
  computeMerkleRoot,
  createInitialGameState,
  serializeHardTransactions,
  validateAndApplyMine,
  validateSelection,
} from '../lib/gameEngine';
import { getTargetPacing, isProofOfWorkValid } from '../lib/targetHash';
import {
  getBlockColumns,
  getRoomBlocksToWin,
  clampBlocksToWin,
} from '../lib/roomConfig';
import { reportMine } from '../lib/roomApi';
import { normalizePlayerName } from '../lib/playerNames';
import { useLocale } from '../i18n/LocaleContext';
import { useModalFocus } from '../hooks/useModalFocus';
import { clearGameDraft, clearSoloSessionMeta, gameDraftContext, loadGameDraft, saveGameDraft } from '../lib/gameDraft';
import { miningHaptic, selectionHaptic } from '../lib/haptics';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export default function HardGame({
  onHome,
  onViewResults,
  roomSeed = '',
  playerName = '',
  initialRoomData = null,
  blocksToWin: blocksToWinProp = 3,
  sessionToken = '',
  playerState = null,
  onPlayerState,
  syncStatus = 'online',
  soloSessionId = '',
  powLevel = '2',
}) {
  const { tr } = useLocale();
  const [gameSeed] = useState(() => roomSeed || soloSessionId || Math.random().toString(36).substring(2, 10));
  const draftContext = useMemo(() => gameDraftContext({ difficulty: 'hard', roomSeed, playerName, soloSessionId }), [roomSeed, playerName, soloSessionId]);
  const [initialDraft] = useState(() => loadGameDraft(draftContext, roomSeed ? playerState : null));

  const [gameState, setGameState] = useState(() => initialDraft?.gameState ?? createInitialGameState('hard', gameSeed, powLevel));
  const { balanceHistory, mempool, targetHash, blockNum, feesEarned = 0 } = gameState;
  const [selectedTxIds, setSelectedTxIds] = useState(() => initialDraft?.draft.selectedTxIds ?? []);
  const [gameTab, setGameTab] = useState('play');

  const [nonce, setNonce] = useState(() => initialDraft?.draft.nonce ?? 0);
  const [finalHash, setFinalHash] = useState(() => initialDraft?.draft.finalHash ?? '');
  const [firstHash, setFirstHash] = useState('');
  const [secondHash, setSecondHash] = useState('');
  const [merkleRoot, setMerkleRoot] = useState('');
  const [blockHeader, setBlockHeader] = useState('');
  const [miningDone, setMiningDone] = useState(false);
  const [hasAcknowledgedPow, setHasAcknowledgedPow] = useState(() => initialDraft?.draft.hasAcknowledgedPow ?? false);
  const [rollingDice, setRollingDice] = useState(false);
  const [diceFaces, setDiceFaces] = useState(() => initialDraft?.draft.diceFaces ?? emptyDiceFaces());
  const [rollCount, setRollCount] = useState(() => initialDraft?.draft.rollCount ?? 0);
  const [messageKey, setMessageKey] = useState(() => initialDraft && (initialDraft.draft.selectedTxIds.length || initialDraft.draft.rollCount) ? 'draftRestored' : null);
  const [lastMinedBlockId, setLastMinedBlockId] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [rulesGuideMode, setRulesGuideMode] = useState('hard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectedTxId, setRejectedTxId] = useState(null);
  const [lastMinedFees, setLastMinedFees] = useState(0);

  const blocks = useMemo(() => [
    { id: 0, nonce: 0, dateMined: '', transactions: [] },
    ...(gameState.history || []).map((block) => ({
      id: block.index,
      nonce: block.nonce,
      dateMined: '',
      totalFees: block.totalFees,
      transactions: block.transactions,
      previousBlockHash: block.previousBlockHash,
      merkleRoot: block.merkleRoot,
      targetHash: block.targetHash,
      blockHash: block.blockHash,
      header: block.header,
      firstHash: block.firstHash,
      secondHash: block.secondHash,
      bits: block.bits,
      timestamp: block.timestamp,
      version: block.version,
    })),
  ], [gameState.history]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const closeBlockDetails = useCallback(() => setSelectedBlock(null), []);
  const navigateBlock = useCallback((direction) => {
    setSelectedBlock((current) => {
      const index = blocks.findIndex((block) => block.id === current?.id);
      return blocks[index + direction] ?? current;
    });
  }, [blocks]);
  const blockSwipe = useSwipeNavigation(
    () => navigateBlock(-1),
    () => navigateBlock(1),
  );
  const selectedBlockIndex = selectedBlock
    ? blocks.findIndex((block) => block.id === selectedBlock.id)
    : -1;
  const blockDialogRef = useModalFocus(Boolean(selectedBlock), closeBlockDetails);
  const effectiveRoom = initialRoomData;

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
    : gameState.history.length;
  const columns = useMemo(() => getBlockColumns(blocksToWinLive), [blocksToWinLive]);

  const [soloWon, setSoloWon] = useState(false);
  const gameOver = soloWon || effectiveRoom?.status === 'finished';
  const selectedTxs = useMemo(
    () => getTransactionsInSelectionOrder(mempool, selectedTxIds),
    [mempool, selectedTxIds],
  );
  const selectedFeeTotal = selectedTxs.reduce((sum, tx) => sum + tx.fee, 0);

  const baseString = useMemo(
    () => selectedTxs.length === 3 ? serializeHardTransactions(selectedTxs) : '',
    [selectedTxs],
  );


  useEffect(() => {
    if (selectedTxs.length !== 3) {
      setMerkleRoot('');
      setBlockHeader('');
      return undefined;
    }
    let cancelled = false;
    computeMerkleRoot(selectedTxs).then((root) => {
      if (!cancelled) setMerkleRoot(root);
    });
    return () => { cancelled = true; };
  }, [selectedTxs]);

  useEffect(() => {
    if (!finalHash || selectedTxs.length !== 3) return undefined;
    let cancelled = false;
    (async () => {
      const proof = await computeHardBlockHash({
        transactions: selectedTxs,
        previousBlockHash: gameState.previousBlockHash,
        version: gameState.blockVersion,
        timestamp: gameState.blockTimestamp,
        bits: gameState.bits,
        nonce,
      });
      if (cancelled) return;
      setMerkleRoot(proof.merkleRoot);
      setBlockHeader(proof.header);
      setFirstHash(proof.firstHash);
      setSecondHash(proof.secondHash);
      if (proof.finalHash !== finalHash) {
        setFinalHash('');
        setFirstHash('');
        setSecondHash('');
        setMiningDone(false);
        setHasAcknowledgedPow(false);
        return;
      }
      setMiningDone(isProofOfWorkValid(proof.finalHash, targetHash));
    })();
    return () => { cancelled = true; };
  }, [finalHash, nonce, selectedTxs, gameState.previousBlockHash, gameState.blockVersion, gameState.blockTimestamp, gameState.bits, targetHash]);

  useEffect(() => {
    if (selectedTxIds.length !== 3) {
      setNonce(0);
      setFinalHash('');
      setFirstHash('');
      setSecondHash('');
      setMerkleRoot('');
      setBlockHeader('');
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
    setFirstHash('');
    setSecondHash('');
    setRollingDice(false);
  }, [gameOver]);

  const currentBalances = balanceHistory[balanceHistory.length - 1];

  const applyPlayerState = useCallback((state) => {
    if (!state) return;
    setGameState(state);
    setSelectedTxIds([]);
    setNonce(0);
    setFinalHash('');
    setFirstHash('');
    setSecondHash('');
    setMerkleRoot('');
    setBlockHeader('');
    setMiningDone(false);
    setHasAcknowledgedPow(false);
    setRollCount(0);
    setDiceFaces(emptyDiceFaces());
    onPlayerState?.(state);
  }, [onPlayerState]);

  useEffect(() => {
    if (!roomSeed || !playerState) return;
    const saved = loadGameDraft(draftContext, playerState);
    setGameState(playerState);
    if (saved) {
      setSelectedTxIds(saved.draft.selectedTxIds);
      setNonce(saved.draft.nonce);
      setFinalHash(saved.draft.finalHash);
      setMiningDone(false);
      setHasAcknowledgedPow(saved.draft.hasAcknowledgedPow);
      setDiceFaces(saved.draft.diceFaces);
      setRollCount(saved.draft.rollCount);
      if (saved.draft.selectedTxIds.length || saved.draft.rollCount) setMessageKey('draftRestored');
    } else {
      setSelectedTxIds([]);
      setNonce(0);
      setFinalHash('');
      setFirstHash('');
      setSecondHash('');
      setMiningDone(false);
      setHasAcknowledgedPow(false);
      setDiceFaces(emptyDiceFaces());
      setRollCount(0);
    }
  }, [roomSeed, playerState, draftContext]);

  useEffect(() => {
    if (gameOver) return;
    saveGameDraft(draftContext, gameState, {
      selectedTxIds, nonce, finalHash, miningDone, hasAcknowledgedPow, diceFaces, rollCount,
    });
  }, [draftContext, gameState, selectedTxIds, nonce, finalHash, miningDone, hasAcknowledgedPow, diceFaces, rollCount, gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    clearGameDraft(draftContext);
    if (!roomSeed) clearSoloSessionMeta();
  }, [gameOver, draftContext, roomSeed]);

  const handleHome = useCallback(() => {
    clearGameDraft(draftContext);
    if (!roomSeed) clearSoloSessionMeta();
    onHome();
  }, [draftContext, roomSeed, onHome]);

  const commitBlock = async (blockNonce) => {
    if (gameOver || selectedTxIds.length !== 3) return;
    setIsSubmitting(true);
    const proof = { blockIndex: blockNum, selectedTxIds, nonce: blockNonce };
    const result = roomSeed
      ? await reportMine(roomSeed, sessionToken, proof)
      : await validateAndApplyMine({
          difficulty: 'hard',
          roomSeed: gameSeed,
          state: gameState,
          proof,
        });
    setIsSubmitting(false);

    if (roomSeed ? result?.room && result?.playerState : result?.ok) {
      clearGameDraft(draftContext);
      const nextState = roomSeed ? result.playerState : result.state;
      if (roomSeed) applyPlayerState(nextState);
      else {
        setGameState(nextState);
        setSelectedTxIds([]);
        setNonce(0);
        setFinalHash('');
        setFirstHash('');
        setSecondHash('');
        setMiningDone(false);
        setHasAcknowledgedPow(false);
        setRollCount(0);
        setDiceFaces(emptyDiceFaces());
      }
      setLastMinedBlockId(blockNum);
      setLastMinedFees(result.block?.totalFees ?? selectedFeeTotal);
      setMessageKey('blockMinedHardWithFees');
      if (!roomSeed && nextState.history.length >= blocksToWinLive) setSoloWon(true);
      return;
    }

    const error = result?.error;
    setMessageKey(
      error === 'FEES_NOT_MAXIMIZED'
        ? 'errFeesNotMaximized'
        : error === 'INSUFFICIENT_BALANCE'
          ? 'errTxBalance'
          : error === 'UNEXPECTED_BLOCK'
            ? 'errStateRefreshed'
            : roomSeed && (error === 'CONNECT_ERROR' || !error)
              ? 'errConnect'
              : 'errNonceWrong',
    );
  };

  const handleMineBlock = () => {
    if (!miningDone || !finalHash || gameOver) return;
    void commitBlock(nonce);
  };

  const rollDiceForPow = async () => {
    if (!merkleRoot || !targetHash || gameOver || rollingDice || miningDone) return;
    const selection = validateSelection(gameState, selectedTxIds);
    if (!selection.ok) {
      setMessageKey(selection.error === 'FEES_NOT_MAXIMIZED' ? 'errFeesNotMaximized' : selection.error === 'INSUFFICIENT_BALANCE' ? 'errTxBalance' : 'errSelect3');
      return;
    }

    setRollingDice(true);
    setMessageKey(null);
    setRejectedTxId(null);
    const nextRoll = rollCount + 1;
    try {
      await new Promise((r) => setTimeout(r, 250));
      const { dice, nonce: rolledNonce } = nonceFromDiceRoll(nextRoll);
      const proof = await computeHardBlockHash({
        transactions: selectedTxs,
        previousBlockHash: gameState.previousBlockHash,
        version: gameState.blockVersion,
        timestamp: gameState.blockTimestamp,
        bits: gameState.bits,
        nonce: rolledNonce,
      });
      const hash = proof.finalHash;
      const valid = isProofOfWorkValid(hash, targetHash);
      setRollCount(nextRoll);
      setDiceFaces(dice);
      setNonce(rolledNonce);
      setFinalHash(hash);
      setMerkleRoot(proof.merkleRoot);
      setBlockHeader(proof.header);
      setFirstHash(proof.firstHash);
      setSecondHash(proof.secondHash);
      setMiningDone(valid);
      setHasAcknowledgedPow(false);
      miningHaptic(valid);
      if (valid) setMessageKey('powHashValid');
    } finally {
      setRollingDice(false);
    }
  };

  const toggleSelection = (id) => {
    if (gameOver) return;
    setMessageKey(null);
    setRejectedTxId(null);

    if (selectedTxIds.includes(id)) {
      selectionHaptic(false);
      setSelectedTxIds(selectedTxIds.filter((txId) => txId !== id));
      return;
    }

    if (selectedTxIds.length >= 3) {
      setRejectedTxId(id);
      setMessageKey('errSelect3');
      return;
    }

    if (canSelectTransaction(id, mempool, selectedTxIds, currentBalances)) {
      selectionHaptic(selectedTxIds.length === 2);
      setSelectedTxIds([...selectedTxIds, id]);
      return;
    }

    setRejectedTxId(id);
    setMessageKey(getRejectReasonKey(id, mempool, selectedTxIds, currentBalances));
  };

  const canRollDice = selectedTxIds.length === 3 && !!merkleRoot && !gameOver && !miningDone;
  const powFound = miningDone && !!finalHash;
  const toastMessage =
    messageKey === 'blockMinedHardWithFees' && lastMinedBlockId != null
      ? tr('blockMinedHardWithFees', { n: lastMinedBlockId, fees: lastMinedFees })
      : messageKey
        ? tr(messageKey)
        : '';
  const toastVariant =
    !messageKey ||
    messageKey === 'blockMinedHardWithFees' || messageKey === 'powHashValid'
      ? 'ok'
      : 'err';

  const targetPacing = useMemo(() => getTargetPacing(targetHash), [targetHash]);
  return (
    <div className="bp-app">
      <main className="bp-main bp-main--wide">
        <div className="bp-game">
          <GameHud
            onHome={handleHome}
            onHelp={() => {
              setRulesGuideMode('hard');
              setShowHowToPlay(true);
            }}
            difficulty="hard"
            roomSeed={roomSeed}
            syncStatus={syncStatus}
            stats={[
              {
                label: tr('hudTxLabel'),
                shortLabel: tr('hudTxShort'),
                kind: 'selection',
                count: selectedTxIds.length,
                ready: selectedTxIds.length === 3,
                meta: tr('selectedFeesShort', { fees: selectedFeeTotal }),
              },
              { label: tr('powAttempts'), value: rollCount },
              { label: tr('feesEarnedHud'), value: feesEarned, title: tr('feesEarned') },
            ]}
          >
            <GamePinnedChain
              columns={columns}
              minedCount={roomSeed ? blocksMinedLive + 1 : blocks.length}
              blocksMined={blocksMinedLive}
              blockGoal={blocksToWinLive}
              onBlockClick={(i) => blocks[i] && setSelectedBlock(blocks[i])}
              clickable
            />
          </GameHud>

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
            onHome={handleHome}
            onViewResults={onViewResults}
            soloWin={soloWon}
            blocksToWin={blocksToWinLive}
          />

          <GameWorkspaceLayout
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
                    <PanelCard
                      className="bp-panel--selected-summary"
                      title={tr('selectedTxHard')}
                      iconSrc={ICON.save}
                      compact
                      active={selectedTxIds.length === 3}
                      bodyClassName="bp-panel__body--flush"
                    >
                      <BlockCandidateTray
                        transactions={selectedTxs}
                        feeTotal={selectedFeeTotal}
                        onRemove={toggleSelection}
                      />
                    </PanelCard>
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
                    <div className="bp-mempool-quick-tools">
                      <CollapsibleSection
                        title={tr('balanceSheet')}
                        iconSrc={ICON.coin}
                        defaultOpen={false}
                      >
                        <BalanceSheetTable columns={columns} balanceHistory={balanceHistory} />
                      </CollapsibleSection>
                    </div>
                    <MempoolTable
                      transactions={mempool}
                      selectedIds={selectedTxIds}
                      onToggle={toggleSelection}
                      rejectedId={rejectedTxId}
                      rejectionMessage={rejectedTxId != null && messageKey ? tr(messageKey) : ''}
                      disabled={gameOver}
                      showUserIcons={false}
                    />
                  </PanelCard>
                  <PanelCard
                    className="bp-panel--mining-action"
                    title={tr('miningController')}
                    iconSrc={ICON.pickaxe}
                    active={powFound || selectedTxIds.length === 3}
                    bodyClassName="bp-panel__body--sections"
                  >
                    <MiningPhaseIndicator phase={isSubmitting || powFound ? 'confirm' : selectedTxIds.length === 3 ? 'mine' : 'select'} />
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
                      <p className="bp-hint">{tr('powTargetHint')}</p>
                      {targetPacing && (
                        <p className="bp-hint">
                          {tr('powTargetPacing', { median: targetPacing.median, p90: targetPacing.p90 })}
                        </p>
                      )}
                    </PanelSection>

                    {(canRollDice || powFound) && (
                      <PanelSection title={tr('rollDice')} variant="action">
                        <PowDicePanel
                          diceFaces={diceFaces}
                          rollCount={rollCount}
                          nonce={nonce}
                          rolling={rollingDice}
                          disabled={!canRollDice || isSubmitting}
                          powFound={powFound}
                          error={!miningDone && rollCount > 0 && !rollingDice}
                          onRoll={rollDiceForPow}
                        />
                      </PanelSection>
                    )}

                    {selectedTxIds.length === 3 && (
                      <CollapsibleSection
                        title={tr('candidateDetails')}
                        iconSrc={ICON.microscope}
                        defaultOpen={false}
                      >
                        <div className="bp-game-play-stack">
                          <PanelSection title={tr('headerFields')}>
                            <dl className="bp-header-fields">
                              <div><dt>{tr('fieldVersion')}</dt><dd>0x{gameState.blockVersion.toString(16).padStart(8, '0')}</dd></div>
                              <div><dt>{tr('fieldTimestamp')}</dt><dd>{gameState.blockTimestamp}</dd></div>
                              <div><dt>{tr('fieldBits')}</dt><dd>0x{gameState.bits.toString(16).padStart(8, '0')}</dd></div>
                              {rollCount > 0 && <div><dt>{tr('nonce')}</dt><dd>{formatPowNonce(nonce)}</dd></div>}
                            </dl>
                          </PanelSection>
                          <PanelSection title={tr('previousBlockHash')} variant="mono">
                            <div className="bp-hash bp-hash--compact">{gameState.previousBlockHash}</div>
                          </PanelSection>
                          {merkleRoot && (
                            <PanelSection title={tr('merkleRoot')} variant="mono">
                              <div className="bp-hash bp-hash--compact">{merkleRoot}</div>
                            </PanelSection>
                          )}
                          {baseString && (
                            <PanelSection title={tr('rawTxData')} variant="mono">
                              <div className="bp-hash bp-hash--compact" style={{ wordBreak: 'break-all', fontSize: '0.8em', color: 'var(--text-dim)' }}>
                                {baseString}
                              </div>
                            </PanelSection>
                          )}
                          {blockHeader && (
                            <PanelSection title={tr('blockHeader')} variant="mono">
                              <div className="bp-hash bp-hash--compact" style={{ wordBreak: 'break-all', fontSize: '0.8em', color: 'var(--text-dim)' }}>
                                {blockHeader}
                              </div>
                            </PanelSection>
                          )}
                        </div>
                      </CollapsibleSection>
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
                        <button type="button" className="bp-btn bp-btn-solid bp-btn--block bp-btn--pulse" onClick={handleMineBlock} disabled={isSubmitting} aria-busy={isSubmitting}>
                          <BpIcon src={ICON.pickaxe} className="bp-icon" tone="on-solid" />
                          <span className="bp-btn__label">{isSubmitting ? tr('checkingBlock') : tr('mineBlock')}</span>
                        </button>
                      </PanelSection>
                    )}
                  </PanelCard>

                  <CollapsibleSection
                    title={tr('liveVerifier')}
                    iconSrc={ICON.microscope}
                    defaultOpen={false}
                  >
                    <LiveVerifierPanel
                      headerHex={blockHeader}
                      firstHash={firstHash}
                      secondHash={secondHash}
                      displayHash={finalHash}
                      targetHash={targetHash}
                      valid={powFound}
                    />
                  </CollapsibleSection>
                </div>
              ),
                }}
          />
        </div>
      </main>

      <MobileMiningDock
        summary={
          <BlockCandidateTray
            transactions={selectedTxs}
            feeTotal={selectedFeeTotal}
            onRemove={toggleSelection}
            compact
          />
        }
        details={
          <div className="bp-mobile-mining-dock__details-stack">
            <p className="bp-hint">{tr('powTargetHint')}</p>
            {targetPacing && (
              <p className="bp-hint">
                {tr('powTargetPacing', { median: targetPacing.median, p90: targetPacing.p90 })}
              </p>
            )}
            <dl className="bp-mobile-mining-dock__facts">
              <div><dt>{tr('powAttempts')}</dt><dd>{rollCount}</dd></div>
              {rollCount > 0 && <div><dt>{tr('nonce')}</dt><dd>{formatPowNonce(nonce)}</dd></div>}
              {finalHash && <div><dt>{tr('hashResult')}</dt><dd>{`${finalHash.slice(0, 8)}…`}</dd></div>}
            </dl>
            <ShakeToMineControl disabled={!canRollDice || isSubmitting} onShake={rollDiceForPow} />
          </div>
        }
      >
        <button
          type="button"
          className="bp-btn bp-btn-solid bp-mobile-mining-dock__button bp-mobile-mining-dock__button--wide"
          onClick={powFound && hasAcknowledgedPow ? handleMineBlock : rollDiceForPow}
          aria-busy={isSubmitting || rollingDice}
          disabled={isSubmitting || rollingDice || (!canRollDice && !(powFound && hasAcknowledgedPow))}
        >
          {isSubmitting
            ? tr('checkingBlock')
            : rollingDice
              ? tr('powRolling')
              : powFound && hasAcknowledgedPow
                ? tr('mineBlock')
                : selectedTxIds.length !== 3
                  ? tr('selectMoreTransactions', { count: 3 - selectedTxIds.length })
                  : tr('rollDice')}
        </button>
      </MobileMiningDock>

      <GameToast
        message={toastMessage}
        variant={toastVariant}
        onDismiss={() => { setMessageKey(null); setRejectedTxId(null); }}
      />

      {selectedBlock && (
        <div className="modal-overlay" onClick={closeBlockDetails}>
          <div
            ref={blockDialogRef}
            className="modal-content bp-block-details-sheet"
            onClick={(e) => e.stopPropagation()}
            {...blockSwipe}
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-details-title"
          >
            <div className="modal-header">
              <h3 id="block-details-title">{tr('blockDetails', { n: selectedBlock.id })}</h3>
              <ModalCloseButton onClick={closeBlockDetails} />
            </div>
            <div className="modal-body">
              <p className="bp-block-swipe-hint">{tr('swipeBlocksHint')}</p>
              <BlockDetailsContent block={selectedBlock} difficulty="hard" />
              <div className="bp-block-sheet-nav">
                <button type="button" className="bp-btn bp-btn-outline" disabled={selectedBlockIndex <= 0} onClick={() => navigateBlock(-1)}>{tr('previousBlock')}</button>
                <button type="button" className="bp-btn bp-btn-outline" disabled={selectedBlockIndex < 0 || selectedBlockIndex >= blocks.length - 1} onClick={() => navigateBlock(1)}>{tr('nextBlock')}</button>
              </div>
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
