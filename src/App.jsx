import { useState, useEffect, useCallback, useRef } from 'react';
import EasyGame from './games/EasyGame';
import HardGame from './games/HardGame';
import HowToPlay from './HowToPlay';
import AppFooter from './components/AppFooter';
import MenuLogo from './components/MenuLogo';
import LangToggle from './components/LangToggle';
import ActionCard from './components/ActionCard';
import AppNavActions from './components/AppNavActions';
import RoomInvite from './components/RoomInvite';
import ApiStatusBanner from './components/ApiStatusBanner';
import GameSetupPanel from './components/GameSetupPanel';
import RoomSettingsCard from './components/RoomSettingsCard';
import LobbyShell from './components/LobbyShell';
import ConfirmDialog from './components/ConfirmDialog';
import LobbyPlayerList from './components/LobbyPlayerList';
import GameResultsPanel from './components/GameResultsPanel';
import HostDashboard from './components/HostDashboard';
import BpIcon from './components/BpIcon';
import { ICON } from './assets/icons';
import { DEFAULT_BLOCKS_TO_WIN, clampNumPlayers } from './lib/roomConfig';
import NumPlayersControl from './components/NumPlayersControl';
import {
  createRoom,
  joinRoom,
  startRoom,
  fetchRoomStatus,
  resetRoom,
  rejoinRoom,
} from './lib/roomApi';
import { BITPOLITO_WEBSITE_URL } from './lib/siteConfig';
import { isPlayerNameTaken } from './lib/playerNames';
import { readJoinCodeFromUrl, clearJoinParamsFromUrl } from './lib/roomJoin';
import {
  getHostDisplayName,
  isRoomHost,
  findPlayerInRoom,
  isActivePlayer,
  hostParticipatesInGame,
  resolveRoomView,
} from './lib/roomAuth';
import {
  saveRoomSession,
  loadRoomSession,
  clearRoomSession,
} from './lib/roomSession';
import { useLocale } from './i18n/LocaleContext';

function App() {
  const { tr } = useLocale();
  const [currentView, setCurrentView] = useState('menu');
  const [difficulty, setDifficulty] = useState('easy');
  const [blocksToWin, setBlocksToWin] = useState(DEFAULT_BLOCKS_TO_WIN);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [rulesDifficulty, setRulesDifficulty] = useState('easy');

  const [playerName, setPlayerName] = useState('');
  const [numPlayers, setNumPlayers] = useState(3);
  const [roomSeed, setRoomSeed] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [joinPreview, setJoinPreview] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [hostParticipates, setHostParticipates] = useState(false);
  const [restoringSession, setRestoringSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [peekLoading, setPeekLoading] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const leaveActionRef = useRef(null);
  const sessionRestoredRef = useRef(false);

  const hostDisplayName = getHostDisplayName(roomData) || playerName;
  const myPlayer = findPlayerInRoom(roomData, { sessionId, playerName });
  const minerName = myPlayer?.name ?? '';
  const isHostUser = isRoomHost(sessionId, roomData) || isHost;
  const isMiner = !!myPlayer || (isHostUser && hostParticipatesInGame(roomData));

  const applyRejoinResult = useCallback((data) => {
    const room = data.room;
    setRoomSeed(room.seed);
    setRoomData(room);
    setSessionId(data.sessionId);
    const participates = data.hostParticipates ?? room.hostParticipates ?? false;
    setHostParticipates(!!participates);
    setIsHost(data.role === 'host');
    const name = data.playerName || data.displayName || playerName;
    setPlayerName(name);
    const player = findPlayerInRoom(room, {
      sessionId: data.sessionId,
      playerName: name,
    });
    saveRoomSession({
      seed: room.seed,
      sessionId: data.sessionId,
      role: data.role,
      displayName: name,
      hostParticipates: participates,
    });
    setCurrentView(resolveRoomView(room, {
      isHost: data.role === 'host',
      isPlayer: !!player,
    }));
    if (room.difficulty) setDifficulty(room.difficulty);
  }, [playerName]);

  const openRulesGuide = (mode = 'easy') => {
    setRulesDifficulty(mode === 'hard' ? 'hard' : 'easy');
    setShowHowToPlay(true);
  };

  const goHome = () => {
    clearRoomSession();
    setCurrentView('menu');
    setRoomSeed('');
    setRoomData(null);
    setJoinPreview(null);
    setErrorMsg('');
    setIsHost(false);
    setSessionId('');
    setHostParticipates(false);
  };

  const shouldConfirmLeave = useCallback(() => {
    if (currentView === 'lobby_waiting' || currentView === 'lobby_finished') return true;
    if (currentView === 'host_dashboard') return true;
    if (currentView === 'game' && roomSeed) return true;
    if (currentView === 'lobby_join' && joinPreview) return true;
    return false;
  }, [currentView, roomSeed, joinPreview]);

  const requestLeaveRoom = useCallback((action) => {
    leaveActionRef.current = action;
    setLeaveConfirmOpen(true);
  }, []);

  const confirmLeave = () => {
    const action = leaveActionRef.current;
    leaveActionRef.current = null;
    setLeaveConfirmOpen(false);
    action?.();
  };

  const cancelLeave = () => {
    leaveActionRef.current = null;
    setLeaveConfirmOpen(false);
  };

  const goHomeSafe = useCallback(() => {
    if (shouldConfirmLeave()) {
      requestLeaveRoom(goHome);
    } else {
      goHome();
    }
  }, [shouldConfirmLeave, requestLeaveRoom]);

  const leaveDialog = leaveConfirmOpen ? (
    <ConfirmDialog
      title={tr('confirmLeaveRoomTitle')}
      message={tr('confirmLeaveRoomBody')}
      confirmLabel={tr('confirmLeave')}
      cancelLabel={tr('cancel')}
      onConfirm={confirmLeave}
      onCancel={cancelLeave}
    />
  ) : null;

  const goToResults = useCallback(async () => {
    if (!roomSeed) return;
    const result = await fetchRoomStatus(roomSeed);
    if (result?.room) setRoomData(result.room);
    setCurrentView('lobby_finished');
  }, [roomSeed]);

  const mapRoomError = (err) => {
    if (err === 'connect') return tr('errConnect');
    if (err === 'Name already taken') return tr('errNameTaken');
    if (err === 'Room is full') return tr('errRoomFull');
    if (err === 'Room not found') return tr('errRoomNotFound');
    if (err === 'Game already started') return tr('errRoomNotWaiting');
    if (err === 'Not in this room') return tr('errNotInRoom');
    if (err === 'Only the room host can start the game') return tr('errOnlyHostStart');
    if (err === 'At least one player must join') return tr('startNeedsOnePlayer');
    return err;
  };

  const handleCreateRoom = async () => {
    setErrorMsg('');
    if (!playerName.trim()) {
      setErrorMsg(tr('errNameRequired'));
      return;
    }
    setCreatingRoom(true);
    const participates = hostParticipates;
    const data = await createRoom({
      hostName: playerName.trim(),
      numPlayers,
      blocksToWin,
      difficulty,
      hostParticipates: participates,
    });
    setCreatingRoom(false);
    if (data.success) {
      setRoomSeed(data.seed);
      setRoomData(data.room);
      setSessionId(data.hostSessionId || data.sessionId);
      setIsHost(true);
      setHostParticipates(participates);
      saveRoomSession({
        seed: data.seed,
        sessionId: data.hostSessionId || data.sessionId,
        role: 'host',
        displayName: playerName.trim(),
        hostParticipates: participates,
      });
      setCurrentView(resolveRoomView(data.room, {
        isHost: true,
        isPlayer: participates,
      }));
    } else {
      setErrorMsg(mapRoomError(data.error));
    }
  };

  const handlePeekRoom = async () => {
    setErrorMsg('');
    setJoinPreview(null);
    if (!roomSeed.trim()) {
      setErrorMsg(tr('errRoomCodeRequired'));
      return;
    }
    setPeekLoading(true);
    const result = await fetchRoomStatus(roomSeed);
    setPeekLoading(false);
    if (result?.error === 'connect') {
      setErrorMsg(tr('errConnect'));
      return;
    }
    if (!result?.room) {
      setErrorMsg(tr('errRoomNotFound'));
      return;
    }
    if (result.room.status !== 'waiting') {
      setErrorMsg(tr('errRoomNotWaiting'));
      return;
    }
    setJoinPreview(result.room);
    setRulesDifficulty(result.room.difficulty || 'easy');
    if (result.room.players.length >= result.room.numPlayers) {
      setErrorMsg(tr('errRoomFull'));
    }
  };

  const handleJoinRoom = async () => {
    setErrorMsg('');
    if (!playerName.trim() || !roomSeed.trim()) {
      setErrorMsg(tr('errNameAndRoom'));
      return;
    }
    if (joinPreview && isPlayerNameTaken(joinPreview, playerName)) {
      setErrorMsg(tr('errNameTaken'));
      return;
    }
    setJoiningRoom(true);
    const data = await joinRoom(roomSeed, playerName);
    setJoiningRoom(false);
    if (data.success) {
      const code = roomSeed.toUpperCase();
      setRoomSeed(code);
      setIsHost(false);
      setSessionId(data.sessionId);
      setRoomData(data.room);
      setJoinPreview(null);
      clearJoinParamsFromUrl();
      saveRoomSession({
        seed: code,
        sessionId: data.sessionId,
        role: 'player',
        displayName: playerName.trim(),
        hostParticipates: false,
      });
      setCurrentView('lobby_waiting');
    } else {
      setErrorMsg(mapRoomError(data.error));
    }
  };

  const handleStartGame = async () => {
    setErrorMsg('');
    const data = await startRoom(
      roomSeed,
      roomData?.difficulty ?? difficulty,
      isHostUser ? sessionId : undefined,
    );
    if (data.success) {
      setRoomData(data.room);
      if (data.room.difficulty) setDifficulty(data.room.difficulty);
      if (isHostUser && !hostParticipatesInGame(data.room)) {
        setCurrentView('host_dashboard');
      } else if (isMiner) {
        setCurrentView('game');
      }
    } else {
      setErrorMsg(mapRoomError(data.error));
    }
  };

  const handlePlayAgain = async () => {
    setErrorMsg('');
    const data = await resetRoom(roomSeed, {
      hostSessionId: sessionId,
      hostName: hostDisplayName,
    });
    if (data.success) {
      setRoomData(data.room);
      setCurrentView(resolveRoomView(data.room, {
        isHost: isHostUser,
        isPlayer: isActivePlayer(sessionId, data.room, minerName || playerName),
      }));
    } else {
      setErrorMsg(data.error || tr('errConnect'));
    }
  };

  useEffect(() => {
    if (sessionRestoredRef.current) return;
    const saved = loadRoomSession();
    if (!saved?.seed || !saved?.sessionId) return;
    sessionRestoredRef.current = true;
    setRestoringSession(true);

    let cancelled = false;
    (async () => {
      const data = await rejoinRoom(
        saved.seed,
        saved.displayName,
        saved.sessionId,
        saved.role,
      );
      if (cancelled) return;
      setRestoringSession(false);
      if (data.success) {
        applyRejoinResult(data);
      } else {
        clearRoomSession();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const codeFromUrl = readJoinCodeFromUrl();
    if (!codeFromUrl) return;

    setRoomSeed(codeFromUrl);
    clearJoinParamsFromUrl();

    const saved = loadRoomSession();
    if (saved?.seed === codeFromUrl.toUpperCase() && saved.sessionId) {
      setRestoringSession(true);
      (async () => {
        const data = await rejoinRoom(
          codeFromUrl,
          saved.displayName,
          saved.sessionId,
          saved.role,
        );
        setRestoringSession(false);
        if (data.success) {
          applyRejoinResult(data);
          return;
        }
        setCurrentView('lobby_join');
        const result = await fetchRoomStatus(codeFromUrl);
        if (result?.room?.status === 'waiting') {
          setJoinPreview(result.room);
          setRulesDifficulty(result.room.difficulty || 'easy');
        }
      })();
      return undefined;
    }

    setCurrentView('lobby_join');
    let cancelled = false;
    (async () => {
      const result = await fetchRoomStatus(codeFromUrl);
      if (cancelled) return;
      if (result?.room?.status === 'waiting') {
        setJoinPreview(result.room);
        setRulesDifficulty(result.room.difficulty || 'easy');
        if (result.room.players.length >= result.room.numPlayers) {
          setErrorMsg(tr('errRoomFull'));
        }
      } else if (result?.error === 'connect') {
        setErrorMsg(tr('errConnect'));
      } else if (result?.room) {
        setErrorMsg(tr('errRoomNotWaiting'));
      } else {
        setErrorMsg(tr('errRoomNotFound'));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pollViews = ['lobby_waiting', 'lobby_finished', 'game', 'host_dashboard'];
    if (!pollViews.includes(currentView) || !roomSeed) return undefined;

    const tick = async () => {
      const result = await fetchRoomStatus(roomSeed);
      if (!result?.room) return;
      setRoomData(result.room);
      const room = result.room;
      const player = findPlayerInRoom(room, { sessionId, playerName: minerName || playerName });
      const host = isRoomHost(sessionId, room) || isHostUser;

      if (currentView === 'lobby_waiting') {
        if (room.status === 'playing') {
          if (room.difficulty) setDifficulty(room.difficulty);
          setCurrentView(resolveRoomView(room, { isHost: host, isPlayer: !!player }));
        } else if (room.status === 'finished') {
          setCurrentView(resolveRoomView(room, { isHost: host, isPlayer: !!player }));
        }
      }

      if (currentView === 'host_dashboard') {
        if (room.status === 'playing' && player && hostParticipatesInGame(room)) {
          if (room.difficulty) setDifficulty(room.difficulty);
          setCurrentView('game');
        }
      }

      if (currentView === 'lobby_finished') {
        if (room.status === 'playing') {
          if (room.difficulty) setDifficulty(room.difficulty);
          setCurrentView(resolveRoomView(room, { isHost: host, isPlayer: !!player }));
        } else if (room.status === 'waiting') {
          setCurrentView(resolveRoomView(room, { isHost: host, isPlayer: !!player }));
        }
      }

      if (currentView === 'game' && room.status === 'finished') {
        setCurrentView(resolveRoomView(room, { isHost: host, isPlayer: !!player }));
      }
    };

    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [currentView, roomSeed, sessionId, minerName, playerName, isHostUser]);

  const errorBlock = errorMsg ? (
    <div className="bp-error">
      {errorMsg}
      {errorMsg === tr('errConnect') && (
        <div className="bp-error__hint">{tr('errApiHint')}</div>
      )}
    </div>
  ) : null;

  if (currentView === 'menu') {
    return (
      <div className="bp-app menu-wrapper">
        <div className="menu-top-bar">
          <LangToggle />
        </div>
        <main className="bp-main">
          <div className="main-menu">
            <MenuLogo />
            <p className="menu-tagline">
              <span className="menu-tagline__lead">{tr('menuSubtitleLead')}</span>
              <span className="menu-tagline__detail">{tr('menuSubtitleDetail')}</span>
            </p>
            <ApiStatusBanner />
            {restoringSession && (
              <p className="bp-restore-banner" role="status">{tr('rejoiningSession')}</p>
            )}

            <div className="bp-menu-actions">
              <ActionCard
                title={tr('playSolo')}
                description={tr('playSoloDesc')}
                iconSrc={ICON.pickaxe}
                onClick={() => setCurrentView('solo_setup')}
              />
              <ActionCard
                title={tr('createRoom')}
                description={tr('createRoomDesc')}
                iconSrc={ICON.party}
                onClick={() => {
                  setErrorMsg('');
                  setCurrentView('lobby_create');
                }}
              />
              <ActionCard
                title={tr('joinRoom')}
                description={tr('joinRoomDesc')}
                iconSrc={ICON.wallet}
                onClick={() => {
                  setErrorMsg('');
                  setJoinPreview(null);
                  setRoomSeed('');
                  setCurrentView('lobby_join');
                }}
              />
            </div>

            <AppNavActions
              onRules={() => openRulesGuide('easy')}
              aboutHref={BITPOLITO_WEBSITE_URL}
              aboutAriaLabel={tr('aboutUsAria')}
              className="bp-nav-actions--menu"
            />
          </div>
        </main>
        <AppFooter variant="menu" />
        {showHowToPlay && (
          <HowToPlay
            key={rulesDifficulty}
            initialDifficulty={rulesDifficulty}
            onClose={() => setShowHowToPlay(false)}
          />
        )}
      </div>
    );
  }

  if (currentView === 'solo_setup') {
    return (
      <>
        <LobbyShell
          title={tr('soloSetupTitle')}
          subtitle={tr('soloSetupSubtitle')}
          onBack={() => setCurrentView('menu')}
          onHome={goHome}
          onRules={() => openRulesGuide(difficulty)}
          footer={
            <button
              type="button"
              className="bp-btn bp-btn-solid bp-btn--block"
              onClick={() => setCurrentView('game')}
            >
              <BpIcon src={ICON.pickaxe} className="bp-icon" />
              {tr('startSolo')}
            </button>
          }
        >
          <GameSetupPanel
            compact
            showTitle={false}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            blocksToWin={blocksToWin}
            onBlocksToWinChange={setBlocksToWin}
          />
        </LobbyShell>
        {showHowToPlay && (
          <HowToPlay
            key={rulesDifficulty}
            initialDifficulty={rulesDifficulty}
            onClose={() => setShowHowToPlay(false)}
          />
        )}
        {leaveDialog}
      </>
    );
  }

  if (currentView === 'lobby_create') {
    return (
      <>
      <LobbyShell
        title={tr('createRoomTitle')}
        subtitle={tr('createRoomSubtitle')}
        onBack={() => setCurrentView('menu')}
        onHome={goHome}
        onRules={() => openRulesGuide(difficulty)}
        footer={
          <button
            type="button"
            className="bp-btn bp-btn-solid bp-btn--block"
            onClick={handleCreateRoom}
            disabled={creatingRoom}
          >
            <BpIcon src={ICON.party} className="bp-icon" tone="on-solid" />
            {creatingRoom ? tr('creatingRoom') : tr('createRoom')}
          </button>
        }
      >
        {errorBlock}
        <div className="bp-lobby-form">
          <div className="bp-field">
            <label className="bp-label" htmlFor="host-name">
              {tr('hostOrganizerName')}
            </label>
            <input
              id="host-name"
              className="bp-input"
              type="text"
              placeholder={tr('namePlaceholder')}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <label className="bp-field-checkbox" htmlFor="host-participates">
            <input
              id="host-participates"
              type="checkbox"
              checked={hostParticipates}
              onChange={(e) => setHostParticipates(e.target.checked)}
            />
            <span>
              <strong>{tr('hostParticipatesLabel')}</strong>
              <span className="bp-hint" style={{ display: 'block', marginTop: 4 }}>
                {tr('hostParticipatesHint')}
              </span>
            </span>
          </label>
          <div className="bp-settings-sheet" aria-label={tr('roomSetupAria')}>
            <NumPlayersControl
              compact
              value={numPlayers}
              onChange={(n) => setNumPlayers(clampNumPlayers(n))}
            />
            <GameSetupPanel
              embedded
              compact
              showTitle={false}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              blocksToWin={blocksToWin}
              onBlocksToWinChange={setBlocksToWin}
            />
          </div>
        </div>
      </LobbyShell>
      {showHowToPlay && (
        <HowToPlay
          key={rulesDifficulty}
          initialDifficulty={rulesDifficulty}
          onClose={() => setShowHowToPlay(false)}
        />
      )}
      </>
    );
  }

  if (currentView === 'lobby_join') {
    const preview = joinPreview;
    const joinNameTaken =
      preview && playerName.trim() && isPlayerNameTaken(preview, playerName);
    const canJoin =
      preview &&
      preview.players.length < preview.numPlayers &&
      preview.status === 'waiting' &&
      playerName.trim() &&
      !joinNameTaken;

    return (
      <>
        <LobbyShell
          title={tr('joinRoomTitle')}
          subtitle={preview ? tr('joinRoomSubtitleRules') : tr('joinRoomSubtitleCode')}
          onBack={() => {
            if (preview) {
              setJoinPreview(null);
              setErrorMsg('');
            } else {
              setCurrentView('menu');
            }
          }}
          onHome={goHomeSafe}
          onRules={() => openRulesGuide(preview?.difficulty ?? difficulty)}
          footer={
            preview ? (
              <button
                type="button"
                className="bp-btn bp-btn-solid bp-btn--block"
                onClick={handleJoinRoom}
                disabled={!canJoin || joiningRoom}
              >
                <BpIcon src={ICON.wallet} className="bp-icon" tone="on-solid" />
                {joiningRoom ? tr('joiningRoom') : tr('joinRoom')}
              </button>
            ) : (
              <button
                type="button"
                className="bp-btn bp-btn-solid bp-btn--block"
                onClick={handlePeekRoom}
                disabled={peekLoading || !roomSeed.trim()}
              >
                {peekLoading ? tr('loadingRoom') : tr('findRoom')}
              </button>
            )
          }
        >
          {errorBlock}
          {!preview && (
            <div className="bp-field">
              <label className="bp-label">{tr('roomCode')}</label>
              <input
                className="bp-input bp-input--code"
                type="text"
                placeholder={tr('roomCodePlaceholder')}
                value={roomSeed}
                onChange={(e) => setRoomSeed(e.target.value.toUpperCase())}
              />
            </div>
          )}
          {preview && (
            <div className="bp-lobby-form">
              <RoomInvite code={roomSeed} compact />
              <div className="bp-field">
                <label className="bp-label" htmlFor="join-name">
                  {tr('yourName')}
                </label>
                <input
                  id="join-name"
                  className={`bp-input${joinNameTaken ? ' bp-input--invalid' : ''}`}
                  type="text"
                  placeholder={tr('namePlaceholderJoin')}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setErrorMsg('');
                  }}
                  aria-invalid={joinNameTaken || undefined}
                  aria-describedby={joinNameTaken ? 'join-name-error' : undefined}
                />
                {joinNameTaken && (
                  <p id="join-name-error" className="bp-field-error" role="alert">
                    {tr('errNameTaken')}
                  </p>
                )}
              </div>
              <p className="bp-join-status">
                {tr('playersJoined', {
                  current: preview.players.length,
                  total: preview.numPlayers,
                })}
              </p>
              <RoomSettingsCard room={preview} onShowRules={openRulesGuide} />
            </div>
          )}
        </LobbyShell>
        {showHowToPlay && (
          <HowToPlay
            key={rulesDifficulty}
            initialDifficulty={rulesDifficulty}
            onClose={() => setShowHowToPlay(false)}
          />
        )}
        {leaveDialog}
      </>
    );
  }

  if (currentView === 'lobby_waiting') {
    const playersCount = roomData?.players.length ?? 0;
    const totalPlayers = roomData?.numPlayers ?? numPlayers;

    return (
      <>
      <LobbyShell
        title={tr('waitingLobby')}
        subtitle={isHostUser ? tr('waitingLobbyHost') : tr('waitingLobbyGuest')}
        onBack={goHomeSafe}
        onHome={goHomeSafe}
        onRules={() => openRulesGuide(roomData?.difficulty ?? difficulty)}
        footer={
          isHostUser ? (
            <button
              type="button"
              className="bp-btn bp-btn-solid bp-btn--block"
              onClick={handleStartGame}
              disabled={playersCount < 1}
            >
              {tr('startGame')}
            </button>
          ) : (
            <p className="bp-waiting-note">{tr('waitingHost')}</p>
          )
        }
      >
        <RoomInvite code={roomSeed} compact />
        <div className="bp-lobby-grid">
          <RoomSettingsCard
            room={roomData}
            onShowRules={openRulesGuide}
          />
          <div className="bp-lobby-side">
            <p className="bp-join-status">
              {tr('playersJoined', { current: playersCount, total: totalPlayers })}
            </p>
            <LobbyPlayerList
              players={roomData?.players}
              hostName={hostDisplayName}
              currentName={minerName || playerName}
            />
            {isHostUser && playersCount < totalPlayers && (
              <p className="bp-hint bp-hint--center">{tr('shareCodeHintOptional')}</p>
            )}
            {isHostUser && playersCount < 1 && (
              <p className="bp-hint bp-hint--center">{tr('startNeedsOnePlayer')}</p>
            )}
          </div>
        </div>
      </LobbyShell>
      {showHowToPlay && (
        <HowToPlay
          key={rulesDifficulty}
          initialDifficulty={rulesDifficulty}
          onClose={() => setShowHowToPlay(false)}
        />
      )}
      {leaveDialog}
      </>
    );
  }

  if (currentView === 'host_dashboard') {
    const playersCount = roomData?.players.length ?? 0;
    const totalPlayers = roomData?.numPlayers ?? numPlayers;
    const status = roomData?.status ?? 'waiting';

    return (
      <>
        <LobbyShell
          title={tr('hostDashboardTitle')}
          subtitle={
            status === 'waiting'
              ? tr('hostDashboardWaiting')
              : status === 'playing'
                ? tr('hostDashboardPlaying')
                : tr('hostDashboardFinished')
          }
          onBack={goHomeSafe}
          onHome={goHomeSafe}
          onRules={() => openRulesGuide(roomData?.difficulty ?? difficulty)}
          footer={
            status === 'finished' ? (
              <div className="bp-flow-actions">
                <button
                  type="button"
                  className="bp-btn bp-btn-solid bp-btn--block"
                  onClick={handlePlayAgain}
                >
                  <BpIcon src={ICON.pickaxe} className="bp-icon" tone="on-solid" />
                  {tr('playAgain')}
                </button>
                <button type="button" className="bp-btn bp-btn-ghost bp-btn--block" onClick={goHomeSafe}>
                  {tr('leaveRoom')}
                </button>
              </div>
            ) : (
              <button type="button" className="bp-btn bp-btn-ghost bp-btn--block" onClick={goHomeSafe}>
                {tr('leaveRoom')}
              </button>
            )
          }
        >
          {errorBlock}
          <HostDashboard
            room={roomData}
            roomSeed={roomSeed}
            onStartGame={handleStartGame}
            onPlayAgain={handlePlayAgain}
            onShowRules={openRulesGuide}
            startDisabled={playersCount < 1}
            showStart={status === 'waiting'}
            showPlayAgain={false}
          />
          {status === 'finished' && (
            <GameResultsPanel room={roomData} playerName={hostDisplayName} isHost />
          )}
        </LobbyShell>
        {showHowToPlay && (
          <HowToPlay
            key={rulesDifficulty}
            initialDifficulty={rulesDifficulty}
            onClose={() => setShowHowToPlay(false)}
          />
        )}
        {leaveDialog}
      </>
    );
  }

  if (currentView === 'lobby_finished') {
    return (
      <>
        <LobbyShell
          title={tr('gameOverTitle')}
          subtitle={isHostUser ? tr('gameOverHost') : tr('gameOverGuest')}
          onHome={goHomeSafe}
          onRules={() => openRulesGuide(roomData?.difficulty ?? difficulty)}
          footer={
            <div className="bp-flow-actions">
              {isHostUser && (
                <button type="button" className="bp-btn bp-btn-solid bp-btn--block" onClick={handlePlayAgain}>
                  <BpIcon src={ICON.pickaxe} className="bp-icon" tone="on-solid" />
                  <span className="bp-btn__label">{tr('playAgain')}</span>
                </button>
              )}
              <button type="button" className="bp-btn bp-btn-ghost bp-btn--block" onClick={goHomeSafe}>
                {tr('leaveRoom')}
              </button>
            </div>
          }
        >
          {errorBlock}
          <GameResultsPanel room={roomData} playerName={minerName || playerName} isHost={isHostUser} />
          {!isHostUser && (
            <p className="bp-hint bp-hint--center">{tr('waitHostRematch')}</p>
          )}
        </LobbyShell>
        {leaveDialog}
      </>
    );
  }

  if (currentView === 'game') {
    const gameProps = {
      onHome: roomSeed ? goHomeSafe : goHome,
      onViewResults: roomSeed ? goToResults : undefined,
      roomSeed,
      playerName: minerName || playerName,
      initialRoomData: roomData,
      blocksToWin: roomData?.blocksToWin ?? blocksToWin,
    };
    return (
      <>
        {difficulty === 'easy' ? (
          <EasyGame {...gameProps} />
        ) : (
          <HardGame {...gameProps} />
        )}
        {leaveDialog}
      </>
    );
  }

  return null;
}

export default App;
