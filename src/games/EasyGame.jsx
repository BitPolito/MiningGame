import './easy.css';
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import HowToPlay from '../HowToPlay'
const UserIcon = ({ style, className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'block', margin: '0 auto 5px auto', ...style }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

export default function EasyGame({ onHome, roomSeed, playerName, initialRoomData }) {
  const users = ["Alice", "Bob", "Carol", "Dave"];
  
  const [balanceHistory, setBalanceHistory] = useState([
    users.reduce((acc, user) => ({ ...acc, [user]: 100 }), {})
  ])
  const [blockNum, setBlockNum] = useState(1)
  const [prevTarget, setPrevTarget] = useState(0)
  const [target, setTarget] = useState(550)
  const [mempool, setMempool] = useState([])
  const [selectedTxIds, setSelectedTxIds] = useState([])
  const [nonceInput, setNonceInput] = useState('')
  const [message, setMessage] = useState('')
  const [errorTxId, setErrorTxId] = useState(null)
  const [currentView, setCurrentView] = useState('game')

  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [roomData, setRoomData] = useState(initialRoomData)
  
const getNameValue = (name) => {
    let val = 0;
    for (let i = 0; i < name.length; i++) {
      val += name.toUpperCase().charCodeAt(i) - 64;
    }
    return val;
  }

  const nameValues = users.reduce((acc, user) => ({ ...acc, [user]: getNameValue(user) }), {})

  const generateMempool = (currentBlockNum, balances) => {
    let pool = [];
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 10000) {
      pool = [];
      attempts++;
      let simulatedBalances = { ...balances };
      const numTxs = users.length * (users.length - 1);
      let cheaterIndex = Math.floor(Math.random() * numTxs);
      
      let combs = [];
      for (let s of users) {
        for (let r of users) {
          if (s !== r) combs.push({ sender: s, receiver: r });
        }
      }
      
      // shuffle combinations
      for (let i = combs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combs[i], combs[j]] = [combs[j], combs[i]];
      }

      for (let i = 0; i < numTxs; i++) {
        const isCheater = (i === cheaterIndex);
        let { sender, receiver } = combs[i];
        let amount, fee;

        if (isCheater) {
          const currentBal = simulatedBalances[sender];
          amount = currentBal + Math.floor(Math.random() * 20) + 5;
          if (amount < 20) amount = 20 + Math.floor(Math.random() * 20);
          fee = Math.floor(Math.random() * 10) + 1;
        } else {
          let diff = simulatedBalances[sender] - simulatedBalances[receiver];
          amount = Math.round(30 + diff / 3);

          if (amount < 20) amount = 20 + Math.floor(Math.random() * 10);
          if (amount > 70) amount = 70 - Math.floor(Math.random() * 10);

          let currentBal = simulatedBalances[sender];
          if (amount >= currentBal) {
            amount = currentBal - 5;
            if (amount < 1) amount = 1;
          }

          let maxFee = currentBal - amount;
          fee = Math.floor(Math.random() * Math.min(10, maxFee)) + 1;
          if (fee < 1) fee = 1;

          simulatedBalances[sender] -= (amount + fee);
          simulatedBalances[receiver] += amount;
        }

        pool.push({
          id: currentBlockNum * 100 + i,
          displayId: i + 1,
          sender,
          receiver,
          amount,
          fee
        });
      }

      let vals = users.map(u => simulatedBalances[u]);
      let mean = vals.reduce((a, b) => a + b, 0) / users.length;
      let variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / users.length;
      if (variance <= 100) {
        valid = true;
      }
    }
    setMempool(pool);
  }

  useEffect(() => {
    generateMempool(blockNum, balanceHistory[0])
  }, [])

  useEffect(() => {
    let interval;
    if (roomSeed && roomData && roomData.status !== 'finished') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/room?action=status&seed=${roomSeed}`);
          const data = await res.json();
          if (data.success) {
            setRoomData(data.room);
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [roomSeed, roomData?.status]);


  const toggleSelection = (id) => {
    setMessage('')
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter(txId => txId !== id))
    } else {
      if (selectedTxIds.length < 3) {
        const txToSelect = mempool.find(t => t.id === id);
        const currentBalances = balanceHistory[balanceHistory.length - 1];

        const currentSenderSelected = mempool.filter(t => selectedTxIds.includes(t.id) && t.sender === txToSelect.sender);
        const selectedCost = currentSenderSelected.reduce((sum, t) => sum + t.amount + t.fee, 0);

        // Validation 1: Sufficient Balance (Cumulative)
        if (selectedCost + txToSelect.amount + txToSelect.fee > currentBalances[txToSelect.sender]) {
          setErrorTxId(id);
          setTimeout(() => setErrorTxId(null), 500);
          return;
        }

        // Validation 2: Highest Fee Priority
        const validUnselectedTxs = mempool.filter(t => {
          if (selectedTxIds.includes(t.id)) return false;
          const senderSelectedCost = mempool.filter(sel => selectedTxIds.includes(sel.id) && sel.sender === t.sender).reduce((sum, sel) => sum + sel.amount + sel.fee, 0);
          return (senderSelectedCost + t.amount + t.fee <= currentBalances[t.sender]);
        });

        const needed = 3 - selectedTxIds.length;
        if (needed > 0 && validUnselectedTxs.length > 0) {
          // Sort descending by fee, then ascending by id (older first)
          const sortedUnselectedTxs = [...validUnselectedTxs].sort((a, b) => {
            if (b.fee !== a.fee) {
              return b.fee - a.fee;
            }
            return a.id - b.id;
          });

          // The top `needed` transactions that we are allowed to select from
          const allowedTxs = sortedUnselectedTxs.slice(0, needed);

          if (!allowedTxs.some(t => t.id === txToSelect.id)) {
            setErrorTxId(id);
            setTimeout(() => setErrorTxId(null), 500);
            return;
          }
        }

        setSelectedTxIds([...selectedTxIds, id])
      }
    }
  }

  const handleMine = () => {
    if (selectedTxIds.length !== 3) {
      setMessage('Please select exactly 3 transactions.')
      return
    }

    const selectedTxs = mempool.filter(tx => selectedTxIds.includes(tx.id))
    let blockValue = 0
    selectedTxs.forEach(tx => {
      blockValue += nameValues[tx.sender] + nameValues[tx.receiver] + tx.amount + tx.fee
    })

    const parsedNonce = parseInt(nonceInput, 10)
    if (isNaN(parsedNonce) || parsedNonce <= 0) {
      setMessage('Please enter a valid positive number for Nonce.')
      return
    }

    if (prevTarget + parsedNonce + blockValue === target) {
      // Success! Update balances
      const currentBalances = { ...balanceHistory[balanceHistory.length - 1] }

      selectedTxs.forEach(tx => {
        currentBalances[tx.sender] -= (tx.amount + tx.fee)
        currentBalances[tx.receiver] += tx.amount
        
        // Emit mine event to backend
        if (roomSeed && tx === selectedTxs[0]) {
          fetch('/api/room?action=mine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed: roomSeed, playerName })
          }).catch(console.error);
        }
    
      })

      setBalanceHistory([...balanceHistory, currentBalances])
      setBlockNum(blockNum + 1)
      setPrevTarget(target)
      // Increase target by at least 700 to ensure the next nonce will always be > 0 
      // (Max possible blockValue for 3 txs is around 618)
      setTarget(target + Math.floor(Math.random() * 500) + 700)
      generateMempool(blockNum + 1, currentBalances)
      setSelectedTxIds([])
      setNonceInput('')
      setMessage('Block Mined Successfully! On to the next block.')
    } else {
      setMessage('Incorrect Nonce! Try again.')
    }
  }

  // Generate 7 columns for the balance table
  const columns = users.map((_, i) => i)

  const renderHomeButton = () => (
    <div className="home-btn" onClick={onHome}>
      <img src="/home.svg" alt="Home" />
      <span>Main Menu</span>
    </div>
  )

  const renderGame = () => (
    <div className="app-container">
      {/* LEFT COLUMN */}
      <div className="col-left">

      {roomData && roomData.status === 'finished' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', margin: 0, color: roomData.winner === playerName ? '#4CAF50' : '#f44336' }}>
              {roomData.winner === playerName ? 'YOU WON!' : `${roomData.winner} WON!`}
            </h1>
            <p style={{ fontSize: '1.5rem', marginTop: '20px' }}>{roomData.winner} was the first to mine 6 blocks.</p>
            <button className="btn-pixel" onClick={onHome} style={{ marginTop: '30px' }}>Return to Lobby</button>
          </div>
        </div>
      )}

        {/* Mempool Section */}
        <div className="section-mempool">
          <div className="widget-title">Mempool</div>
          <div className="widget-content" style={{ marginBottom: '30px' }}>
            <table className="mempool-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Fees</th>
                </tr>
              </thead>
              <tbody>
                {mempool.map(tx => (
                  <tr
                    key={tx.id}
                    className={`clickable ${selectedTxIds.includes(tx.id) ? 'selected' : ''} ${errorTxId === tx.id ? 'error-shake' : ''}`}
                    onClick={() => toggleSelection(tx.id)}
                  >
                    <td>{tx.displayId}</td>
                    <td><UserIcon /> {tx.sender}</td>
                    <td><UserIcon /> {tx.receiver}</td>
                    <td>{tx.amount}</td>
                    <td>{tx.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Sheet Section */}
        <div className="section-balances">
          <div className="widget-title">Balance sheet</div>
          <div className="widget-content">
            <table className="balance-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Block</th>
                  {columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u}>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserIcon style={{ margin: 0 }} />
                        <span>{u}</span>
                      </div>
                    </td>
                    {columns.map(col => {
                      const bal = balanceHistory[col] ? balanceHistory[col][u] : '-'
                      return <td key={col}>{bal}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="col-right">
        {/* Blockchain Visualizer Section */}
        <div className="section-blockchain" style={{ marginBottom: '30px' }}>
          <div className="widget-title" style={{ fontSize: '0.9rem', padding: '8px' }}>BlockChain</div>
          <div className="widget-content blockchain-container" style={{ justifyContent: 'flex-start' }}>
            {[...Array(blockNum).keys()].map((i, index, arr) => (
              <div key={i} className="block-wrapper">
                <div className="block-column">
                  <div className="block-square"></div>
                  <div className="block-number">#{i}</div>
                </div>
                {index < arr.length - 1 && <div className="block-connector"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Transactions Section */}
        <div className="section-selected">
          <div className="widget-title">Selected transactions</div>
          <div className="widget-content" style={{ marginBottom: '30px', minHeight: '220px' }}>
            <table className="mempool-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Fees</th>
                </tr>
              </thead>
              <tbody>
                {mempool.filter(tx => selectedTxIds.includes(tx.id)).map(tx => (
                  <tr key={tx.id}>
                    <td>{tx.displayId}</td>
                    <td><UserIcon /> {tx.sender}</td>
                    <td><UserIcon /> {tx.receiver}</td>
                    <td>{tx.amount}</td>
                    <td>{tx.fee}</td>
                  </tr>
                ))}
                {selectedTxIds.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ opacity: 0.5, paddingTop: '40px' }}>No transactions selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nonce Section */}
        <div className="section-nonce" style={{ marginBottom: '30px' }}>
          <div className="nonce-container">
            <button className="nonce-btn" onClick={handleMine} disabled={selectedTxIds.length !== 3}>
              Nonce
            </button>
            <div className="nonce-input-wrapper">
              <input
                type="text"
                placeholder="?"
                value={nonceInput}
                onChange={e => setNonceInput(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Target Section */}
        <div className="section-targets">
          <div className="target-section">
            <div className="widget-title">Block Target</div>
            <div className="widget-content target-box">
              {target}
            </div>
          </div>

          <div className="target-section">
            <div className="widget-title">Previous Block Target</div>
            <div className="widget-content target-box">
              {prevTarget}
            </div>
          </div>
        </div>

        {/* Name Values Guide Section */}
        <div className="section-nameguide" style={{ marginTop: '20px' }}>
          <div className="widget-title" style={{ fontSize: '0.9rem', padding: '8px' }}>Name Guide</div>
          <div className="widget-content" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px', minHeight: 'auto' }}>
            {users.map(u => (
              <div key={u} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{u}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-blue)' }}>{nameValues[u]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: message.includes('Successfully') ? 'var(--color-blue)' : 'var(--color-red)', color: 'white', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        {/* Multiplayer Mining Race Section */}
        {roomData && (
          <div className="section-mining-race" style={{ marginTop: '20px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div className="widget-title" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Multiplayer Mining Race</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomData.players.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '80px', fontWeight: 'bold', color: p.name === playerName ? 'var(--color-blue)' : '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name} {p.name === playerName && '(You)'}
                  </div>
                  <div style={{ flex: 1, background: '#eee', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${(p.blocks / 6) * 100}%`, background: p.blocks >= 6 ? '#4CAF50' : 'var(--color-blue)', height: '100%', transition: 'width 0.3s' }}></div>
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{p.blocks}/6</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )

  
  return (
    <div className="easy-game-wrapper">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="help-icon" onClick={() => setShowHowToPlay(true)}>?</div>
        {renderGame()}
        {renderHomeButton()}
      </div>
      {showHowToPlay && <HowToPlay difficulty="easy" onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}
