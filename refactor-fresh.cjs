const fs = require('fs');

function refactorFresh(source, dest, name, wrapperClass, cssFile) {
    let content = fs.readFileSync(source, 'utf8');
    
    // Change function name and add props
    content = content.replace(/function App\(\) \{/, `export default function ${name}({ onHome }) {`);
    
    // Replace currentView usages to bypass it
    content = content.replace(/const \[currentView, setCurrentView\] = useState\('menu'\)/g, "const [currentView, setCurrentView] = useState('game')");
    content = content.replace(/onClick=\{.*?setCurrentView\('menu'\).*?\}/g, "onClick={onHome}");
    
    // Import CSS
    if (cssFile) {
        content = `import './${cssFile}';\n` + content;
    }

    // Now, we truncate everything from `if (currentView === 'menu') {`
    const index = content.indexOf("if (currentView === 'menu') {");
    if (index !== -1) {
        let newEnding = `
  return (
    <div className="${wrapperClass}">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {renderGame()}
        {renderHomeButton()}
      </div>
`;
        if (name === 'HardGame') {
            newEnding += `
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
`;
        }
        
        newEnding += `
    </div>
  );
}
`;
        content = content.substring(0, index) + newEnding;
    }
    
    fs.writeFileSync(dest, content);
}

refactorFresh('../blockgame/src/App.jsx', 'src/games/EasyGame.jsx', 'EasyGame', 'easy-game-wrapper', 'easy.css');
refactorFresh('../2blockgame/src/App.jsx', 'src/games/MediumGame.jsx', 'MediumGame', 'medium-game-wrapper', 'medium.css');

// For HardGame, source is an older copy of App.jsx, but since we overwrote App.jsx, we can use git checkout or grab it from what we had.
// I already copied `src/App.jsx` to `src/games/HardGame.jsx` earlier, so it contains the original!
// But wait, it might be corrupted by my previous `refactor-games.cjs`. Let's just fix the truncation for it.
