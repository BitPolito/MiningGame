import { useState, useMemo, useCallback, useEffect } from 'react';
import HowToPlay from '../HowToPlay';
import ModalCloseButton from '../components/ModalCloseButton';
import GameHud from '../components/game/GameHud';
import WinOverlay from '../components/WinOverlay';
import GameToast from '../components/GameToast';
import { useGameNotice } from '../hooks/useGameNotice';
import PanelCard from '../components/PanelCard';
import MempoolTable from '../components/game/MempoolTable';
import MempoolNameGuide from '../components/game/MempoolNameGuide';
import BalanceSheetTable from '../components/game/BalanceSheetTable';
import MempoolRulesPanel from '../components/game/MempoolRulesPanel';
import CollapsibleSection from '../components/game/CollapsibleSection';
import GameWorkspaceLayout from '../components/game/GameWorkspaceLayout';
import GamePinnedChain from '../components/game/GamePinnedChain';
import EasyTargetPair from '../components/game/EasyTargetPair';
import PanelSection from '../components/game/PanelSection';
import EasyFormulaPanel from '../components/game/EasyFormulaPanel';
import MiningPhaseIndicator from '../components/game/MiningPhaseIndicator';
import BpIcon from '../components/BpIcon';
import BlockCandidateTray from '../components/game/BlockCandidateTray';
import BlockDetailsContent from '../components/game/BlockDetailsContent';
import MobileMiningDock from '../components/game/MobileMiningDock';
import { ICON } from '../assets/icons';
import { canSelectTransaction, getRejectReasonKey, getTransactionsInSelectionOrder } from '../lib/txSelection';
import { createInitialGameState, validateAndApplyMine, validateSelection } from '../lib/gameEngine';
import {
  getBlockColumns,
  getRoomBlocksToWin,
  clampBlocksToWin,
} from '../lib/roomConfig';
import { reportMine } from '../lib/roomApi';
import { useLocale } from '../i18n/LocaleContext';
import { useModalFocus } from '../hooks/useModalFocus';
import { clearGameDraft, clearSoloSessionMeta, gameDraftContext, loadGameDraft, saveGameDraft } from '../lib/gameDraft';
import { miningHaptic, selectionHaptic } from '../lib/haptics';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export default function EasyGame({
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
}) {
  const { tr } = useLocale();
  const [gameSeed] = useState(() => roomSeed || soloSessionId || Math.random().toString(36).substring(2, 10));
  const draftContext = useMemo(() => gameDraftContext({ difficulty: 'easy', roomSeed, playerName, soloSessionId }), [roomSeed, playerName, soloSessionId]);
  const [initialDraft] = useState(() => loadGameDraft(draftContext, roomSeed ? playerState : null));

  const [gameState, setGameState] = useState(() => initialDraft?.gameState ?? createInitialGameState('easy', gameSeed));
  const { balanceHistory, blockNum, prevTarget, target, mempool, feesEarned = 0 } = gameState;
  const [selectedTxIds, setSelectedTxIds] = useState(() => initialDraft?.draft.selectedTxIds ?? []);
  const [gameTab, setGameTab] = useState('play');
  const [nonceInput, setNonceInput] = useState(() => initialDraft?.draft.nonceInput ?? '');
  const [messageKey, setMessageKey, noticeId] = useGameNotice(initialDraft && (initialDraft.draft.selectedTxIds.length || initialDraft.draft.nonceInput) ? 'draftRestored' : null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [rulesGuideMode, setRulesGuideMode] = useState('easy');
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
      prevTarget: block.prevTarget,
      target: block.target,
      blockValue: block.blockValue,
      transactions: block.transactions,
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
    () => clampBlocksToWin(roomSeed ? getRoomBlocksToWin(effectiveRoom) : blocksToWinProp),
    [roomSeed, effectiveRoom, blocksToWinProp],
  );
  const columns = useMemo(() => getBlockColumns(blocksToWinLive), [blocksToWinLive]);

  const [soloWon, setSoloWon] = useState(false);
  const gameOver = soloWon || effectiveRoom?.status === 'finished';

  const currentBalances = balanceHistory[balanceHistory.length - 1];

  const selectedTxs = useMemo(
    () => getTransactionsInSelectionOrder(mempool, selectedTxIds),
    [mempool, selectedTxIds],
  );
  const selectedFeeTotal = selectedTxs.reduce((sum, tx) => sum + tx.fee, 0);
  const toastMessage = messageKey === 'blockMinedWithFees'
    ? tr(messageKey, { fees: lastMinedFees })
    : messageKey ? tr(messageKey) : '';
  const toastVariant = !messageKey || messageKey === 'blockMinedWithFees' || messageKey === 'draftRestored' ? 'ok' : 'err';

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

  const applyPlayerState = useCallback((state) => {
    if (!state) return;
    setGameState(state);
    setSelectedTxIds([]);
    setNonceInput('');
    onPlayerState?.(state);
  }, [onPlayerState]);

  useEffect(() => {
    if (!roomSeed || !playerState) return;
    const saved = loadGameDraft(draftContext, playerState);
    setGameState(playerState);
    if (saved) {
      setSelectedTxIds(saved.draft.selectedTxIds);
      setNonceInput(saved.draft.nonceInput);
      if (saved.draft.selectedTxIds.length || saved.draft.nonceInput) setMessageKey('draftRestored');
    } else {
      setSelectedTxIds([]);
      setNonceInput('');
    }
  }, [roomSeed, playerState, draftContext, setMessageKey]);

  useEffect(() => {
    if (gameOver) return;
    saveGameDraft(draftContext, gameState, { selectedTxIds, nonceInput });
  }, [draftContext, gameState, selectedTxIds, nonceInput, gameOver]);

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

  const handleMine = async () => {
    if (gameOver) return;
    const selection = validateSelection(gameState, selectedTxIds);
    if (!selection.ok) {
      setMessageKey(
        selection.error === 'FEES_NOT_MAXIMIZED'
          ? 'errFeesNotMaximized'
          : selection.error === 'INSUFFICIENT_BALANCE'
            ? 'errTxBalance'
            : 'errSelect3',
      );
      return;
    }

    const parsedNonce = Number(nonceInput);
    if (!Number.isSafeInteger(parsedNonce) || parsedNonce <= 0) {
      setMessageKey('errNoncePositive');
      return;
    }

    setIsSubmitting(true);
    const proof = { blockIndex: blockNum, selectedTxIds, nonce: parsedNonce };
    const result = roomSeed
      ? await reportMine(roomSeed, sessionToken, proof)
      : await validateAndApplyMine({
          difficulty: 'easy',
          roomSeed: gameSeed,
          state: gameState,
          proof,
        });
    setIsSubmitting(false);

    if (roomSeed ? result?.room && result?.playerState : result?.ok) {
      miningHaptic(true);
      clearGameDraft(draftContext);
      const nextState = roomSeed ? result.playerState : result.state;
      if (roomSeed) applyPlayerState(nextState);
      else {
        setGameState(nextState);
        setSelectedTxIds([]);
        setNonceInput('');
      }
      setLastMinedFees(result.block?.totalFees ?? selection.totalFees);
      setMessageKey('blockMinedWithFees');
      if (!roomSeed && nextState.history.length >= blocksToWinLive) setSoloWon(true);
      if (roomSeed && result.won) void onViewResults?.(result.room, result.playerState);
      return;
    }

    const error = result?.error;
    miningHaptic(false);
    setMessageKey(
      error === 'FEES_NOT_MAXIMIZED'
        ? 'errFeesNotMaximized'
        : error === 'INSUFFICIENT_BALANCE'
          ? 'errTxBalance'
          : error === 'INVALID_SELECTION'
            ? 'errSelect3'
            : error === 'UNEXPECTED_BLOCK'
              ? 'errStateRefreshed'
              : roomSeed && (error === 'CONNECT_ERROR' || !error)
                ? 'errConnect'
                : 'errNonceWrong',
    );
  };

  return (
    <div className="bp-app bp-app--easy">
      <main className="bp-main bp-main--wide">
        <div className="bp-game">
          <GameHud
            onHome={handleHome}
            onHelp={() => {
              setRulesGuideMode('easy');
              setShowHowToPlay(true);
            }}
            difficulty="easy"
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
              { label: tr('blockTarget'), shortLabel: tr('blockTargetShort'), value: target },
              { label: tr('feesEarnedHud'), value: feesEarned, title: tr('feesEarned') },
            ]}
          >
            <GamePinnedChain
              columns={columns}
              minedCount={blockNum}
              blocksMined={Math.max(0, blockNum - 1)}
              blockGoal={blocksToWinLive}
              onBlockClick={(i) => blocks[i] && setSelectedBlock(blocks[i])}
              clickable
            />
          </GameHud>

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
                      title={tr('selectedTx')}
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
                      <p className="bp-hint bp-hint--compact">{tr('mempoolHintEasyShort')}</p>
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
                    />
                    <div className="bp-mempool-foot">
                      <CollapsibleSection
                        title={tr('nameGuide')}
                        iconSrc={ICON.info}
                        defaultOpen={false}
                      >
                        <MempoolNameGuide />
                      </CollapsibleSection>
                    </div>
                  </PanelCard>
                  <PanelCard
                    className="bp-panel--mining-action"
                    title={tr('mineBlock')}
                    iconSrc={ICON.pickaxe}
                    active
                    bodyClassName="bp-panel__body--sections"
                  >
                    <MiningPhaseIndicator phase={isSubmitting ? 'confirm' : selectedTxIds.length === 3 ? 'mine' : 'select'} />
                    <PanelSection variant="mine">
                      <EasyFormulaPanel />
                      <EasyTargetPair previousTarget={prevTarget} target={target} />
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
                            disabled={gameOver || isSubmitting}
                            autoComplete="off"
                          />
                        </label>
                        <button
                          type="button"
                          className="bp-btn bp-btn-solid bp-mining-toolbar__btn"
                          onClick={handleMine}
                          disabled={selectedTxIds.length !== 3 || gameOver || isSubmitting}
                          aria-busy={isSubmitting}
                        >
                          <BpIcon src={ICON.pickaxe} className="bp-icon--sm" tone="on-solid" />
                          <span className="bp-btn__label">{isSubmitting ? tr('checkingBlock') : tr('mineBlock')}</span>
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

      <MobileMiningDock
        stageLabel={selectedTxIds.length < 3 ? tr('phaseSelect') : tr('phaseMine')}
        summary={
          <BlockCandidateTray
            transactions={selectedTxs}
            feeTotal={selectedFeeTotal}
            onRemove={toggleSelection}
            compact
          />
        }
        activity={
          <EasyTargetPair previousTarget={prevTarget} target={target} compact />
        }
        details={<EasyFormulaPanel />}
      >
        <input
          className="bp-mobile-mining-dock__input"
          type="text"
          inputMode="numeric"
          aria-label={tr('nonce')}
          placeholder="?"
          value={nonceInput}
          onChange={(event) => setNonceInput(event.target.value)}
          disabled={gameOver || isSubmitting}
        />
        <button
          type="button"
          className="bp-btn bp-btn-solid bp-mobile-mining-dock__button"
          onClick={handleMine}
          disabled={selectedTxIds.length !== 3 || gameOver || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? tr('checkingBlock')
            : selectedTxIds.length !== 3
              ? tr('selectMoreTransactions', { count: 3 - selectedTxIds.length })
              : tr('mineBlock')}
        </button>
      </MobileMiningDock>

      <GameToast
        message={toastMessage}
        variant={toastVariant}
        noticeId={noticeId}
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
              <BlockDetailsContent block={selectedBlock} difficulty="easy" />
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
