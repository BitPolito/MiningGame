import { useState, useEffect } from 'react'
import readmeContent from '../GUIDE.md?raw'
import aboutusContent from '../ABOUTUS.md?raw'
import ReactMarkdown from 'react-markdown'
const UserIcon = ({ style, className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'block', margin: '0 auto 5px auto', ...style }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

function App() {
  const [balanceHistory, setBalanceHistory] = useState([
    { Alice: 100, Bob: 100, Carol: 100, Dave: 100 }
  ])
  const [blockNum, setBlockNum] = useState(1)
  const [prevTarget, setPrevTarget] = useState(0) // matching image for fun
  const [target, setTarget] = useState(550) // Increased initial target to ensure positive nonce for first block
  const [mempool, setMempool] = useState([])
  const [selectedTxIds, setSelectedTxIds] = useState([])
  const [nonceInput, setNonceInput] = useState('')
  const [message, setMessage] = useState('')
  const [currentView, setCurrentView] = useState('menu')

  const users = ["Alice", "Bob", "Carol", "Dave"]

  const getNameValue = (name) => {
    let val = 0;
    for (let i = 0; i < name.length; i++) {
      val += name.toUpperCase().charCodeAt(i) - 64;
    }
    return val;
  }

  const nameValues = {
    Alice: getNameValue("Alice"),
    Bob: getNameValue("Bob"),
    Carol: getNameValue("Carol"),
    Dave: getNameValue("Dave")
  }

  const generateMempool = (currentBlockNum, balances) => {
    const pool = [];
    const cheaterIndex = Math.floor(Math.random() * 7);

    for (let i = 0; i < 7; i++) {
      const isCheater = (i === cheaterIndex);

      let sender, receiver, amount, fee;

      if (isCheater) {
        // Cheater: try to spend more than balance
        const possibleCheaters = users.filter(u => balances[u] < 110);
        sender = possibleCheaters.length > 0
          ? possibleCheaters[Math.floor(Math.random() * possibleCheaters.length)]
          : users[Math.floor(Math.random() * users.length)];

        receiver = sender;
        while (receiver === sender) {
          receiver = users[Math.floor(Math.random() * users.length)];
        }

        // Try to make amount > balance if possible, otherwise cost > balance
        if (balances[sender] < 60) {
          let minAmount = Math.max(30, balances[sender] + 1);
          let minMultiple = Math.ceil(minAmount / 5);
          let maxMultiple = 12; // 60 / 5

          if (minMultiple <= maxMultiple) {
            let options = maxMultiple - minMultiple + 1;
            amount = (Math.floor(Math.random() * options) + minMultiple) * 5;
          } else {
            amount = 60;
          }
          fee = (Math.floor(Math.random() * 5) + 2) * 5; // 10-30
        } else {
          amount = (Math.floor(Math.random() * 7) + 6) * 5; // 30-60
          fee = (Math.floor(Math.random() * 5) + 2) * 5;    // 10-30
          if (amount + fee <= balances[sender]) {
            amount = 60;
            fee = 30;
            if (amount + fee <= balances[sender]) {
              amount = Math.ceil((balances[sender] + 5) / 5) * 5;
              fee = 10;
            }
          }
        }
      } else {
        // Normal valid transaction
        const possibleSenders = users.filter(u => balances[u] >= 40);
        sender = possibleSenders.length > 0
          ? possibleSenders[Math.floor(Math.random() * possibleSenders.length)]
          : users[Math.floor(Math.random() * users.length)];

        receiver = sender;
        while (receiver === sender) {
          receiver = users[Math.floor(Math.random() * users.length)];
        }

        let maxCost = balances[sender];
        if (maxCost < 40) maxCost = 40; // Fallback

        let maxAmountVal = Math.min(60, maxCost - 10);
        let maxAmountMultiple = Math.floor(maxAmountVal / 5);
        if (maxAmountMultiple < 6) maxAmountMultiple = 6;
        let amountOptions = maxAmountMultiple - 6 + 1;
        amount = (Math.floor(Math.random() * amountOptions) + 6) * 5;

        let maxFeeVal = Math.min(30, maxCost - amount);
        let maxFeeMultiple = Math.floor(maxFeeVal / 5);
        if (maxFeeMultiple < 2) maxFeeMultiple = 2;
        let feeOptions = maxFeeMultiple - 2 + 1;
        fee = (Math.floor(Math.random() * feeOptions) + 2) * 5;
      }

      pool.push({
        id: currentBlockNum * 10 + i, // unique ids across blocks
        displayId: i + 1, // matching the image roughly for visual
        sender,
        receiver,
        amount,
        fee
      });
    }
    setMempool(pool);
  }

  useEffect(() => {
    generateMempool(blockNum, balanceHistory[0])
  }, [])

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
          setMessage(`Insufficient balance: ${txToSelect.sender} only has ${currentBalances[txToSelect.sender]}, needs ${selectedCost + txToSelect.amount + txToSelect.fee} for all selected transactions.`);
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
            setMessage(`Miners prioritize! You must select the highest available fees (older transactions first in case of a tie).`);
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
        // Note: the prompt mentioned adding fees to miner, but the balance sheet in the photo doesn't have a miner balance. We'll skip the miner balance display for now.
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
  const columns = [0, 1, 2, 3, 4, 5, 6]

  const renderHomeButton = () => (
    <div className="home-btn" onClick={() => setCurrentView('menu')}>
      <img src="/home.svg" alt="Home" />
      <span>Main Menu</span>
    </div>
  )

  const renderGame = () => (
    <div className="app-container">
      {message && (
        <div className={message.includes('Successfully') ? "success" : "alert"}>
          {message}
        </div>
      )}

      {/* LEFT COLUMN */}
      <div className="col-left">
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
                    className={`clickable ${selectedTxIds.includes(tx.id) ? 'selected' : ''}`}
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
          <div className="widget-content blockchain-container">
            {[...Array(blockNum).keys()].reverse().map((i, index, arr) => (
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

      </div>
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
            <button className="btn-pixel" onClick={() => setCurrentView('game')}>Start</button>
            <button className="btn-pixel" onClick={() => setCurrentView('howToPlay')}>How to play</button>
            <button className="btn-pixel" onClick={() => setCurrentView('aboutUs')}>About us</button>
          </div>
          <div className="menu-footer">
            <img src="/cows.svg" alt="Cows" className="menu-cows" />
            <div className="made-with-love">
              Made with <img src="/love.svg" alt="love" /> by BitPolito
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'howToPlay') {
    return (
      <div className="view-container">
        <div className="content-box">
          <div className="readme-text"><ReactMarkdown>{readmeContent}</ReactMarkdown></div>
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

  // Default is game
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {renderGame()}
      {renderHomeButton()}
    </div>
  )
}

export default App
