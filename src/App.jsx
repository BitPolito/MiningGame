import { useState, useEffect } from 'react'
import aboutusContent from '../ABOUTUS.md?raw'
import ReactMarkdown from 'react-markdown'
import EasyGame from './games/EasyGame'
import HardGame from './games/HardGame'
import HowToPlay from './HowToPlay'

function App() {
  const [currentView, setCurrentView] = useState('menu')
  const [difficulty, setDifficulty] = useState('easy')
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  // Multiplayer state
  const [playerName, setPlayerName] = useState('')
  const [numPlayers, setNumPlayers] = useState(3)
  const [roomSeed, setRoomSeed] = useState('')
  const [roomData, setRoomData] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const renderHomeButton = () => (
    <div className="home-btn" onClick={() => {
      setCurrentView('menu');
      setRoomSeed('');
      setRoomData(null);
      setErrorMsg('');
    }}>
      <img src="/home.svg" alt="Home" />
      <span>Main Menu</span>
    </div>
  )

  const handleCreateRoom = async () => {
    setErrorMsg('');
    if (!playerName) return setErrorMsg('Name is required');
    try {
      const res = await fetch('/api/room?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: playerName, numPlayers })
      });
      const data = await res.json();
      if (data.success) {
        setRoomSeed(data.seed);
        setIsHost(true);
        setCurrentView('lobby_waiting');
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      setErrorMsg('Failed to connect to server');
    }
  }

  const handleJoinRoom = async () => {
    setErrorMsg('');
    if (!playerName || !roomSeed) return setErrorMsg('Name and Room Code are required');
    try {
      const res = await fetch('/api/room?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: roomSeed.toUpperCase(), playerName })
      });
      const data = await res.json();
      if (data.success) {
        setRoomSeed(roomSeed.toUpperCase());
        setIsHost(false);
        setCurrentView('lobby_waiting');
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      setErrorMsg('Failed to connect to server');
    }
  }

  const handleStartGame = async () => {
    try {
      await fetch('/api/room?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: roomSeed })
      });
      // polling will naturally catch the status change to 'playing'
    } catch (e) {
      console.error(e);
    }
  }

  // Poll room status when in waiting room
  useEffect(() => {
    let interval;
    if (currentView === 'lobby_waiting' && roomSeed) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/room?action=status&seed=${roomSeed}`);
          const data = await res.json();
          if (data.success) {
            setRoomData(data.room);
            if (data.room.status === 'playing') {
              setCurrentView('game');
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, roomSeed]);

  if (currentView === 'menu') {
    return (
      <div className="menu-wrapper">
        <div className="main-menu">
          <div className="title-container">
            <img src="/Frame 2.svg" alt="Title" className="menu-title" />
            <img src="/handwrite.png" alt="Handwrite" className="handwrite-img" />
          </div>
          <div className="menu-buttons">
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '15px 0', fontFamily: 'system-ui', color: 'var(--color-blue)', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="difficulty" value="easy" checked={difficulty === 'easy'} onChange={(e) => setDifficulty(e.target.value)} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} /> Easy
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="difficulty" value="hard" checked={difficulty === 'hard'} onChange={(e) => setDifficulty(e.target.value)} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} /> Hard
              </label>
            </div>

            <button className="btn-pixel" onClick={() => setCurrentView('lobby_create')}>Create Room</button>
            <button className="btn-pixel" onClick={() => setCurrentView('lobby_join')}>Join Room</button>

            <button className="btn-pixel" onClick={() => setShowHowToPlay(true)}>How to play</button>
            <button className="btn-pixel" onClick={() => setCurrentView('aboutUs')}>About us</button>
          </div>
          <div className="menu-footer">
            <img src="/cows.svg" alt="Cows" className="menu-cows" />
            <div className="made-with-love">
              Made with <img src="/love.svg" alt="love" /> by BitPolito
            </div>
          </div>
        </div>
        {showHowToPlay && <HowToPlay difficulty={difficulty} onClose={() => setShowHowToPlay(false)} />}
      </div>
    )
  }

  if (currentView === 'lobby_create') {
    return (
      <div className="view-container about-view">
        <div className="content-box">
          <div className="lobby-title">Create Room</div>
          {errorMsg && <div className="lobby-error">{errorMsg}</div>}
          
          <div className="lobby-form">
            <div className="lobby-input-group">
              <label className="lobby-label">Your Name</label>
              <input className="lobby-input" type="text" placeholder="e.g. Satoshi" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            </div>
            
            <div className="lobby-input-group">
              <label className="lobby-label">Total Number of Players</label>
              <input className="lobby-input" type="number" min="2" max="10" placeholder="e.g. 4" value={numPlayers} onChange={e => setNumPlayers(e.target.value)} />
            </div>
            
            <button className="btn-pixel" onClick={handleCreateRoom} style={{ marginTop: '10px' }}>Create Room</button>
          </div>
        </div>
        {renderHomeButton()}
      </div>
    )
  }

  if (currentView === 'lobby_join') {
    return (
      <div className="view-container about-view">
        <div className="content-box">
          <div className="lobby-title">Join Room</div>
          {errorMsg && <div className="lobby-error">{errorMsg}</div>}
          
          <div className="lobby-form">
            <div className="lobby-input-group">
              <label className="lobby-label">Your Name</label>
              <input className="lobby-input" type="text" placeholder="e.g. Hal Finney" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            </div>
            
            <div className="lobby-input-group">
              <label className="lobby-label">Room Code</label>
              <input className="lobby-input" type="text" placeholder="e.g. GENESIS400" value={roomSeed} onChange={e => setRoomSeed(e.target.value.toUpperCase())} />
            </div>
            
            <button className="btn-pixel" onClick={handleJoinRoom} style={{ marginTop: '10px' }}>Join Room</button>
          </div>
        </div>
        {renderHomeButton()}
      </div>
    )
  }

  if (currentView === 'lobby_waiting') {
    const playersCount = roomData ? roomData.players.length : 1;
    const totalPlayers = roomData ? roomData.numPlayers : numPlayers;
    
    return (
      <div className="view-container about-view">
        <div className="content-box">
          <div className="lobby-title">Waiting Lobby</div>
          
          <div className="lobby-seed-display">
            {roomSeed}
          </div>
          
          <div className="lobby-subtitle">
            Players Joined ({playersCount}/{totalPlayers})
          </div>
          
          <ul className="lobby-players-list">
            {roomData?.players.map((p, i) => (
              <li key={i} className="lobby-player-item">
                👤 {p.name} 
                {p.name === playerName && <span className="lobby-player-you">(You)</span>}
              </li>
            ))}
          </ul>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            {isHost ? (
              <button 
                className="btn-pixel" 
                onClick={handleStartGame} 
                disabled={playersCount < totalPlayers}
                style={{ opacity: playersCount < totalPlayers ? 0.5 : 1 }}
              >
                Start Game
              </button>
            ) : (
              <div className="lobby-waiting-text">Waiting for host to start...</div>
            )}
          </div>
        </div>
        {renderHomeButton()}
      </div>
    )
  }

  if (currentView === 'aboutUs') {
    return (
      <div className="view-container about-view">
        <div className="content-box">
          <img src="/Frame 2.svg" alt="Title" className="about-title" />
          <div className="readme-text"><ReactMarkdown>{aboutusContent}</ReactMarkdown></div>
          <img src="/cows.svg" alt="Cows" className="about-cows" />
        </div>
        {renderHomeButton()}
      </div>
    )
  }

  if (currentView === 'game') {
    const gameProps = {
      onHome: () => { setCurrentView('menu'); setRoomSeed(''); },
      roomSeed,
      playerName,
      initialRoomData: roomData
    };
    if (difficulty === 'easy') {
      return <EasyGame {...gameProps} />
    } else {
      return <HardGame {...gameProps} />
    }
  }

  return null;
}

export default App
