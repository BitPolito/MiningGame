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
  const [sessionToken, setSessionToken] = useState('');
  const [playerGameState, setPlayerGameState] = useState(null);
  const [hostParticipates, setHostParticipates] = useState(false);
  const [restoringSession, setRestoringSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [peekLoading, setPeekLoading] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const leaveActionRef = useRef(null);

  const hostDisplayName = getHostDisplayName(roomData) || playerName;
  const myPlayer = findPlayerInRoom(roomData, { playerName });
  const minerName = myPlayer?.name ?? '';
  const isHostUser = isHost;
  const isMiner = !!myPlayer || (isHostUser && hostParticipatesInGame(roomData));

  const applyRejoinResult = useCallback((data, token) => {
    const room = data.room;
    setRoomSeed(room.seed);
    setRoomData(room);
    setSessionToken(token);
    setPlayerGameState(data.playerState ?? null);
    const participates = data.hostParticipates ?? room.hostParticipates ?? false;
    setHostParticipates(!!participates);
    setIsHost(data.role === 'host');
    const name = data.playerName || data.displayName || playerName;
    setPlayerName(name);
    const player = findPlayerInRoom(room, {
      playerName: name,
    });
    saveRoomSession({
      seed: room.seed,
      sessionToken: token,
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
    setSessionToken('');
    setHostParticipates(false);
    setPlayerGameState(null);
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
    const result = await fetchRoomStatus(roomSeed, sessionToken);
    if (result?.room) setRoomData(result.room);
    if (result?.playerState) setPlayerGameState(result.playerState);
    setCurrentView('lobby_finished');
  }, [roomSeed, sessionToken]);

  const mapRoomError = (err) => {
    const key = {
      CONNECT_ERROR: 'errConnect',
      STORAGE_UNAVAILABLE: 'errConnect',
      ROOM_NOT_FOUND: 'errRoomNotFound',
      INVALID_ROOM_CODE: 'errRoomNotFound',
      ROOM_NOT_WAITING: 'errRoomNotWaiting',
      GAME_NOT_PLAYING: 'errRoomNotWaiting',
      ROOM_FULL: 'errRoomFull',
      NAME_TAKEN: 'errNameTaken',
      INVALID_PLAYER_NAME: 'errNameRequired',
      INVALID_SESSION: 'errNotInRoom',
      AUTH_REQUIRED: 'errNotInRoom',
      HOST_ONLY: 'errOnlyHostStart',
      PLAYER_REQUIRED: 'startNeedsOnePlayer',
      INVALID_SELECTION: 'errTxGeneric',
      INVALID_PROOF: 'errNonceWrong',
      UNEXPECTED_BLOCK: 'errConnect',
      ROOM_CONFLICT: 'errConnect',
    }[err];
    return key ? tr(key) : (err || tr('errConnect'));
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
      setSessionToken(data.sessionToken);
      setPlayerGameState(data.playerState ?? null);
      setIsHost(true);
      setHostParticipates(participates);
      saveRoomSession({
        seed: data.seed,
        sessionToken: data.sessionToken,
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
    if (result?.error === 'CONNECT_ERROR') {
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
      setSessionToken(data.sessionToken);
      setPlayerGameState(data.playerState ?? null);
      setRoomData(data.room);
      setJoinPreview(null);
      clearJoinParamsFromUrl();
      saveRoomSession({
        seed: code,
        sessionToken: data.sessionToken,
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
    const data = await startRoom(roomSeed, sessionToken);
    if (data.success) {
      setRoomData(data.room);
      if (data.playerState) setPlayerGameState(data.playerState);
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
    const data = await resetRoom(roomSeed, sessionToken);
    if (data.success) {
      setRoomData(data.room);
      if (data.playerState) setPlayerGameState(data.playerState);
      setCurrentView(resolveRoomView(data.room, {
        isHost: isHostUser,
        isPlayer: isActivePlayer(data.room, minerName || playerName),
      }));
    } else {
      setErrorMsg(mapRoomError(data.error));
    }
  };

  useEffect(() => {
    const saved = loadRoomSession();
    if (!saved?.seed || !saved?.sessionToken) return;
    setRestoringSession(true);

    let cancelled = false;
    (async () => {
      const data = await rejoinRoom(saved.seed, saved.sessionToken);
      if (cancelled) return;
      setRestoringSession(false);
      if (data.success) {
        applyRejoinResult(data, saved.sessionToken);
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

    const saved = loadRoomSession();
    if (saved?.seed === codeFromUrl.toUpperCase() && saved.sessionToken) {
      setRestoringSession(true);
      (async () => {
        const data = await rejoinRoom(codeFromUrl, saved.sessionToken);
        setRestoringSession(false);
        if (data.success) {
          clearJoinParamsFromUrl();
          applyRejoinResult(data, saved.sessionToken);
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
      } else if (result?.error === 'CONNECT_ERROR') {
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

    let cancelled = false;
    let timer;
    let failures = 0;
    let polling = false;

    const tick = async () => {
      if (cancelled || polling) return;
      polling = true;
      try {
      const result = await fetchRoomStatus(roomSeed, sessionToken);
      if (!result?.room) {
        failures += 1;
        return;
      }
      failures = 0;
      setRoomData(result.room);
      if (result.playerState) {
        setPlayerGameState((previous) =>
          previous?.version === result.playerState.version &&
          previous?.blockNum === result.playerState.blockNum
            ? previous
            : result.playerState,
        );
      }
      const room = result.room;
      const player = findPlayerInRoom(room, { playerName: minerName || playerName });
      const host = isHostUser;

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
      } finally {
        polling = false;
        if (!cancelled) timer = setTimeout(tick, Math.min(8000, 1000 * (2 ** failures)));
      }
    };

    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentView, roomSeed, sessionToken, minerName, playerName, isHostUser]);

  const errorBlock = errorMsg ? (
    <div className="bp-error" role="alert">
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
              maxLength={32}
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
              <label className="bp-label" htmlFor="room-code">{tr('roomCode')}</label>
              <input
                id="room-code"
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
                  maxLength={32}
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
      sessionToken: sessionToken,
      playerState: playerGameState,
      onPlayerState: setPlayerGameState,
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
