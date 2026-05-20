import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import HowToPlay from '../HowToPlay'

import SHA256 from 'crypto-js/sha256';

const UserIcon = ({ style, className }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', marginRight: '5px', verticalAlign: 'middle', ...style }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
)

export default function HardGame({ onHome, roomSeed, playerName, initialRoomData }) {
  const [currentView, setCurrentView] = useState('game')
  const [showHowToPlay, setShowHowToPlay] = useState(false)

  const users = ["Alice", "Bob", "Carol", "Dave"];
  const [balances, setBalances] = useState(
    users.reduce((acc, user) => ({ ...acc, [user]: 100 }), {})
  );
  const [mempool, setMempool] = useState([]);
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [roomData, setRoomData] = useState(initialRoomData);


  const [nonce, setNonce] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [miningDone, setMiningDone] = useState(false);
  const [numZeros, setNumZeros] = useState(2);
  const [baseString, setBaseString] = useState("");
  const [txHash, setTxHash] = useState("");
  const [targetHash, setTargetHash] = useState("");
  const [message, setMessage] = useState("");
  const [blocks, setBlocks] = useState([{ id: 0, nonce: 0, dateMined: new Date().toLocaleString(), transactions: [] }]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [errorTxId, setErrorTxId] = useState(null);
  const [verifyRaw, setVerifyRaw] = useState("");
  const [verifyNonce, setVerifyNonce] = useState("");
  const [difficulty, setDifficulty] = useState('easy');

  const generateNewTarget = () => {
    let randomTarget = "";
    for (let i = 0; i < 62; i++) {
      randomTarget += Math.floor(Math.random() * 16).toString(16);
    }
    setTargetHash('00' + randomTarget);
  };

  useEffect(() => {
    generateNewTarget();
    
    // Generate Mempool - using dynamic users
    const pool = [];
    let currentBalances = {};
    users.forEach(u => currentBalances[u] = 100);
    
    let combs = [];
    for (let s of users) {
      for (let r of users) {
        if (s !== r) combs.push({ sender: s, receiver: r });
      }
    }
    for (let i = combs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combs[i], combs[j]] = [combs[j], combs[i]];
    }
    
    let cheaterIndex = Math.floor(Math.random() * combs.length);
    for (let i = 0; i < combs.length; i++) {
      let { sender, receiver } = combs[i];
      let amount, fee;
      if (i === cheaterIndex) {
        amount = currentBalances[sender] + Math.floor(Math.random() * 20) + 5;
        if (amount < 20) amount = 20 + Math.floor(Math.random() * 20);
        fee = Math.floor(Math.random() * 10) + 1;
      } else {
        let diff = currentBalances[sender] - currentBalances[receiver];
        amount = Math.round(30 + diff / 3);
        if (amount < 20) amount = 20 + Math.floor(Math.random() * 10);
        if (amount > 70) amount = 70 - Math.floor(Math.random() * 10);
        if (amount >= currentBalances[sender]) {
          amount = currentBalances[sender] - 5;
          if (amount < 1) amount = 1;
        }
        fee = Math.floor(Math.random() * 5) + 1;
        currentBalances[sender] -= (amount + fee);
        currentBalances[receiver] += amount;
      }
      
      pool.push({
        id: i + 1,
        sender,
        receiver,
        amount,
        fee,
        date: "-2026/05"
      });
    }
    setMempool(pool);
  }, []);

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

  useEffect(() => {
    if (selectedTxIds.length === 3) {
      const selectedTxs = mempool.filter(tx => selectedTxIds.includes(tx.id));
      const baseStr = selectedTxs.map(tx => `${tx.sender}to${tx.receiver}${tx.amount}${tx.date}`).join('-');

      setNumZeros(3);

      const realTxHash = SHA256(baseStr).toString();

      setBaseString(baseStr);
      setTxHash(realTxHash);
      setNonce(0);
      setMiningDone(false);
      setIsMining(false);
    } else {
      setBaseString("");
      setTxHash("");
      setNonce(0);
      setMiningDone(false);
      setIsMining(false);
    }
  }, [selectedTxIds]);

  const startMining = () => {
    if (!baseString) return;
    setIsMining(true);
    setMiningDone(false);
    setNonce(0);
  };

  useEffect(() => {
    let timer;
    if (isMining) {
      timer = setTimeout(() => {
        let currentNonce = nonce;
        let found = false;
        let finalHash = "";

        // Batch 10 attempts per tick to speed it up while animating
        for (let i = 0; i < 10; i++) {
          finalHash = SHA256(txHash + currentNonce).toString();
          if (finalHash.startsWith("00") && finalHash < targetHash) {
            found = true;
            break;
          }
          currentNonce++;
        }

        setNonce(currentNonce);

        if (found) {
          setIsMining(false);
          setMiningDone(true);
        }
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [isMining, nonce, txHash, targetHash]);

  const toggleSelection = (id) => {
    setMessage("");
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter(txId => txId !== id));
    } else {
      if (selectedTxIds.length < 3) {
        // Validate fee
        const sortedMempool = [...mempool].sort((a, b) => b.fee - a.fee);
        const top3 = sortedMempool.slice(0, 3);

        if (!top3.some(t => t.id === id)) {
          setErrorTxId(id);
          setTimeout(() => setErrorTxId(null), 500);
          return;
        }

        setSelectedTxIds([...selectedTxIds, id]);
      }
    }
  }

  const handleMine = () => {
    const selectedTxs = mempool.filter(tx => selectedTxIds.includes(tx.id));

    // Update balances
    const newBalances = { ...balances };
    selectedTxs.forEach(tx => {
      newBalances[tx.sender] -= (tx.amount + tx.fee);
      newBalances[tx.receiver] += tx.amount;
    });
    setBalances(newBalances);
    
    if (roomSeed) {
      fetch('/api/room?action=mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: roomSeed, playerName })
      }).catch(console.error);
    }

    // Update Mempool
    let newMempool = mempool.filter(tx => !selectedTxIds.includes(tx.id));
    // Add 3 new random txs
    let maxId = Math.max(...mempool.map(t => t.id), 0);
    let simulatedBalances = { ...newBalances };
    newMempool.forEach(tx => {
      if (simulatedBalances[tx.sender] !== undefined) {
        simulatedBalances[tx.sender] -= (tx.amount + tx.fee);
      }
    });

    for (let i = 0; i < 3; i++) {
      const validSenders = users.filter(u => simulatedBalances[u] >= 15);
      const sender = validSenders.length > 0 ? validSenders[Math.floor(Math.random() * validSenders.length)] : users[0];
      let receiver = sender;
      while (receiver === sender) receiver = users[Math.floor(Math.random() * users.length)];

      let maxAmount = simulatedBalances[sender] >= 15 ? simulatedBalances[sender] - 10 : 5;
      if (maxAmount > 40) maxAmount = 40;
      const amount = Math.floor(Math.random() * maxAmount) + 1;
      const fee = Math.floor(Math.random() * 10) + 1;

      simulatedBalances[sender] -= (amount + fee);

      newMempool.push({
        id: maxId + i + 1,
        sender, receiver,
        amount,
        fee,
        date: "202605"
      });
    }
    setMempool(newMempool);

    // Update Blockchain
    const newBlock = {
      id: blocks.length,
      nonce: nonce,
      dateMined: new Date().toLocaleString(),
      transactions: [...selectedTxs]
    };
    setBlocks([...blocks, newBlock]);

    // Reset
    setSelectedTxIds([]);
    setNonce(0);
    setMiningDone(false);
    setBaseString("");
    setTxHash("");
    setVerifyRaw("");
    setVerifyNonce("");
    setMessage("Block mined successfully! Block #" + blocks.length + " added.");
    generateNewTarget();
  }

  const selectedTxs = mempool.filter(tx => selectedTxIds.includes(tx.id));

  // Compute Hash Result and Target
  let targetDisplay = targetHash || "Generating target...";
  let hashResultDisplay = "N/A";
  let isWin = false;

  if (baseString) {
    const currentHash = SHA256(txHash + nonce).toString();
    hashResultDisplay = currentHash;
    if (miningDone) {
      isWin = true;
    }
  }

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

        {/* Balances */}
        <div className="section-balances">
          <div className="widget-title">Balances (Genesis)</div>
          <div className="widget-content">
            <table className="balance-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>User</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u}>
                    <td style={{ textAlign: 'left' }}><UserIcon /> {u}</td>
                    <td>{balances[u]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mempool */}
        <div className="section-mempool" style={{ marginTop: '15px' }}>
          <div className="widget-title">Mempool</div>
          <div className="widget-content">
            <table className="mempool-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {mempool.map(tx => {
                  return (
                    <tr
                      key={tx.id}
                      className={`clickable ${selectedTxIds.includes(tx.id) ? 'selected' : ''} ${errorTxId === tx.id ? 'error-shake' : ''}`}
                      onClick={() => toggleSelection(tx.id)}
                    >
                      <td>{tx.id}</td>
                      <td>{tx.sender}</td>
                      <td>{tx.receiver}</td>
                      <td>{tx.amount}</td>
                      <td>{tx.fee}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Txs */}
        <div className="section-selected" style={{ marginTop: '15px' }}>
          <div className="widget-title">Selected Transactions</div>
          <div className="widget-content" style={{ minHeight: '180px' }}>
            <table className="mempool-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {selectedTxs.map(tx => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.sender}</td>
                    <td>{tx.receiver}</td>
                    <td>{tx.amount}</td>
                    <td>{tx.fee}</td>
                  </tr>
                ))}
                {selectedTxs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ opacity: 0.5, paddingTop: '20px', textAlign: 'center' }}>No transactions selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="col-right">
        {/* Target */}
        <div className="section-targets">
          <div className="widget-title">Block Target</div>
          <div className="widget-content hash-box">
            {targetDisplay}
          </div>
        </div>

        {/* Mining Controls */}
        <div className="section-nonce" style={{ marginTop: '15px' }}>
          <div className="widget-title">Mining Controller</div>
          <div className="widget-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <button
              className={`btn-pixel ${isMining ? 'btn-disabled' : ''}`}
              style={{ width: '80%', padding: '15px', fontSize: '1rem' }}
              onClick={startMining}
              disabled={isMining || !baseString || isWin}
            >
              {isMining ? 'Mining...' : 'Start to increase nonce'}
            </button>
            <div style={{ marginTop: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              Nonce: {nonce}
            </div>
            <div style={{ marginTop: '5px', fontSize: '0.8rem', opacity: 0.7 }}>
              {isMining ? 'Searching for a valid hash...' : 'Click to start find nonce'}
            </div>
          </div>
        </div>

        {/* Hash Result */}
        <div className="section-hash" style={{ marginTop: '15px' }}>
          <div className="widget-title">Hash Result</div>
          <div className={`widget-content hash-box ${isWin ? 'win-hash' : ''}`}>
            {hashResultDisplay}
            {isWin && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px dashed rgba(21, 87, 36, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase' }}>Transactions Hash</div>
                <div style={{ wordBreak: 'break-all', marginBottom: '15px' }}>{txHash}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '5px', textTransform: 'uppercase' }}>Raw Transaction Data</div>
                <div style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: '#155724' }}>{baseString}</div>
              </div>
            )}
          </div>
          {isWin && (
            <button
              className="btn-pixel"
              style={{ width: '100%', marginTop: '15px', padding: '15px', fontSize: '1.2rem', backgroundColor: '#28a745', color: 'white', border: 'none' }}
              onClick={handleMine}
            >
              MINE BLOCK!
            </button>
          )}
        </div>

        {/* Blockchain Visualizer */}
        <div className="section-blockchain" style={{ marginTop: '15px' }}>
          <div className="widget-title">Blockchain</div>
          <div className="widget-content blockchain-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflowX: 'auto', padding: '10px' }}>
            {blocks.map((block, index, arr) => (
              <div key={block.id} className="block-wrapper" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div
                  className="block-column"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  onClick={() => setSelectedBlock(block)}
                >
                  <div className="block-square" style={{ width: '45px', height: '45px', backgroundColor: 'var(--color-blue)', borderRadius: '8px', transition: 'transform 0.1s' }} onMouseOver={e => e.target.style.transform = 'scale(1.1)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}></div>
                  <div className="block-number" style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-blue)' }}>#{block.id}</div>
                </div>
                {index < arr.length - 1 && <div className="block-connector" style={{ width: '25px', height: '2px', backgroundColor: 'var(--color-blue)', marginBottom: '30%' }}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* SHA-256 Verifier */}
        <div className="section-verifier" style={{ marginTop: '15px' }}>
          <div className="widget-title">Live SHA-256 Verifier</div>
          <div className="widget-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="win-hash" style={{ padding: '15px', borderRadius: '8px', border: '1px solid #c3e6cb', fontWeight: 'bold' }}>
              <textarea
                value={verifyRaw}
                onChange={e => setVerifyRaw(e.target.value)}
                placeholder="Paste raw transaction data here..."
                style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid #c3e6cb', resize: 'vertical', backgroundColor: 'rgba(255,255,255,0.7)', color: '#155724' }}
              />

              <hr style={{ border: 'none', borderTop: '2px dashed rgba(21, 87, 36, 0.3)', margin: '15px 0' }} />

              <div style={{ wordBreak: 'break-all', textAlign: 'center' }}>
                {verifyRaw ? SHA256(verifyRaw).toString() : "Awaiting input..."}
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed rgba(21, 87, 36, 0.3)', margin: '15px 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ wordBreak: 'break-all', flex: 1, fontSize: '0.9rem', opacity: 0.8, textAlign: 'right' }}>
                  {verifyRaw ? SHA256(verifyRaw).toString() : "..."}
                </div>
                <div style={{ fontSize: '1.2rem', color: '#155724' }}>|</div>
                <input
                  type="text"
                  value={verifyNonce}
                  onChange={e => setVerifyNonce(e.target.value)}
                  placeholder="Nonce"
                  style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #c3e6cb', backgroundColor: 'rgba(255,255,255,0.7)', color: '#155724', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed rgba(21, 87, 36, 0.3)', margin: '15px 0' }} />

              <div style={{ wordBreak: 'break-all', textAlign: 'center', fontSize: '1.1rem' }}>
                {verifyRaw && verifyNonce ? SHA256(SHA256(verifyRaw).toString() + verifyNonce).toString() : "Final output will appear here..."}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: message.includes('Target') || message.includes('generated') || message.includes('mined') ? 'var(--color-blue)' : 'var(--color-red)', color: 'white', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold' }}>
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
    <div className="hard-game-wrapper">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="help-icon" onClick={() => setShowHowToPlay(true)}>?</div>
        {renderGame()}
        {renderHomeButton()}
      </div>
      {selectedBlock && (
        <div className="modal-overlay" onClick={() => setSelectedBlock(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Block #{selectedBlock.id} Details</h3>
              <button className="modal-close" onClick={() => setSelectedBlock(null)}>✖</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'left' }}>
              <p style={{ margin: '5px 0' }}><strong>Nonce:</strong> {selectedBlock.nonce}</p>
              <p style={{ margin: '5px 0' }}><strong>Mined On:</strong> {selectedBlock.dateMined}</p>
              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Transactions ({selectedBlock.transactions.length})</h4>
              {selectedBlock.transactions.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="mempool-table">
                    <thead>
                      <tr><th>From</th><th>To</th><th>Amount</th><th>Fee</th></tr>
                    </thead>
                    <tbody>
                      {selectedBlock.transactions.map((tx, idx) => (
                        <tr key={idx}><td>{tx.sender}</td><td>{tx.receiver}</td><td>{tx.amount}</td><td>{tx.fee}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ opacity: 0.7 }}>Genesis Block (No transactions)</p>
              )}
            </div>
          </div>
        </div>
      )}
      {showHowToPlay && <HowToPlay difficulty="hard" onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}
