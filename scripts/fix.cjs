const fs = require('fs');
function fixEnding(file) {
    let content = fs.readFileSync(file, 'utf8');
    let idx = content.indexOf("if (currentView === 'menu') {");
    if (idx !== -1) {
        content = content.substring(0, idx);
    }
    // Also remove the `const renderGame = () => (\n <div className="something-wrapper">` we added, and just leave it as normal `renderGame` or we just invoke it correctly.
    // Actually, earlier we did: `const renderGame = () => (\n    <div className="hard-game-wrapper">`
    // Let's just close the file properly!
    
    // Check if the file is EasyGame, MediumGame, or HardGame.
    let ending = `
  return (
    <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {renderGame()}
      {renderHomeButton()}
    </div>
  );
}
`;
    if (file.includes('HardGame')) {
        ending = `
  return (
    <div className="hard-game-wrapper">
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
    
    fs.writeFileSync(file, content + ending);
    
    // Fix unresolved imports in Easy and Medium
    let c2 = fs.readFileSync(file, 'utf8');
    c2 = c2.replace(/import aboutusContent.*?;\n/g, '');
    c2 = c2.replace(/import readmeContent.*?;\n/g, '');
    fs.writeFileSync(file, c2);
}

fixEnding('src/games/EasyGame.jsx');
fixEnding('src/games/MediumGame.jsx');
fixEnding('src/games/HardGame.jsx');
