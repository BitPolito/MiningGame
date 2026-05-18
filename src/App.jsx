import { useState } from 'react'
import aboutusContent from '../ABOUTUS.md?raw'
import ReactMarkdown from 'react-markdown'
import EasyGame from './games/EasyGame'
import HardGame from './games/HardGame'
import HowToPlay from './HowToPlay'

function App() {
  const [currentView, setCurrentView] = useState('menu')
  const [difficulty, setDifficulty] = useState('easy')
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  const renderHomeButton = () => (
    <div className="home-btn" onClick={() => setCurrentView('menu')}>
      <img src="/home.svg" alt="Home" />
      <span>Main Menu</span>
    </div>
  )

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

            <button className="btn-pixel" onClick={() => setCurrentView('game')}>Start</button>

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
    if (difficulty === 'easy') {
      return <EasyGame onHome={() => setCurrentView('menu')} />
    } else {
      return <HardGame onHome={() => setCurrentView('menu')} />
    }
  }

  return null;
}

export default App
