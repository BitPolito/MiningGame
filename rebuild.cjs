const fs = require('fs');

function rebuild(src, dest, name, wrapperClass, hasModal) {
    let content = fs.readFileSync(src, 'utf8');
    
    // 1. Rename App
    content = content.replace(/function App\(\) \{/, `export default function ${name}({ onHome }) {`);
    
    // 2. Remove bad imports
    content = content.replace(/import aboutusContent.*?;\n/g, '');
    content = content.replace(/import readmeContent.*?;\n/g, '');
    
    // 3. Fix currentView
    content = content.replace(/const \[currentView, setCurrentView\] = useState\('menu'\)/g, "const [currentView, setCurrentView] = useState('game')");
    content = content.replace(/onClick=\{.*?setCurrentView\('menu'\).*?\}/g, "onClick={onHome}");
    
    // 4. Find the menu block
    let idx = content.indexOf("if (currentView === 'menu') {");
    if (idx === -1) {
        console.log("Could not find menu block in " + src);
        return;
    }
    
    content = content.substring(0, idx);
    
    // 5. Append generic render logic
    let ending = `
  return (
    <div className="${wrapperClass}">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {renderGame()}
        {renderHomeButton()}
      </div>
    </div>
  );
}
`;
    if (hasModal) {
        ending = `
  return (
    <div className="${wrapperClass}">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
    </div>
  );
}
`;
    }
    
    fs.writeFileSync(dest, content + ending);
}

// Ensure the source files are pristine
// We can use the original ones from other directories
rebuild('../blockgame/src/App.jsx', 'src/games/EasyGame.jsx', 'EasyGame', 'easy-game-wrapper', false);
rebuild('../2blockgame/src/App.jsx', 'src/games/MediumGame.jsx', 'MediumGame', 'medium-game-wrapper', false);

// For HardGame, I'll grab an original copy if possible, or just parse what we have. Wait, what we have is corrupted.
// I will check out src/App.jsx from git to get the original 3blockgame App.jsx, but since it's already overwritten... 
// Wait! I can grab it from ../3blockgame ? No, we are IN 3blockgame.
// Do I have the original App.jsx somewhere? 
// Yes, I can just use git.
rebuild('src/App.jsx', 'src/games/HardGame.jsx', 'HardGame', 'hard-game-wrapper', true);
