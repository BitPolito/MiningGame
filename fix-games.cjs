const fs = require('fs');

function fix(file, wrapperClass) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find "if (currentView === 'menu') {"
    const index = content.indexOf("if (currentView === 'menu') {");
    if (index !== -1) {
        // Find the "export default App" or similar at the end
        // Wait, for HardGame we need the modal code. Let's look at the original file.
        // It's easier: just replace everything from index to end with a generic return.
        // What about the modal in HardGame? We can just append it if it's HardGame.
        
        let newEnding = `
  return (
    <div className="${wrapperClass}">
      <div className="view-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {renderGame()}
        {renderHomeButton()}
      </div>
`;
        if (file.includes('HardGame')) {
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
    
    // Also fix the corrupted `renderGame` from previous script
    // The previous script did: const renderGame = () => (\n    <div className="hard-game-wrapper">
    // and replaced `</> ) if` with `</div> ) if`.
    // Let's just fix it:
    content = content.replace(/const renderGame = \(\) => \(\n    <div className="[^"]+">\n/, 'const renderGame = () => (\n');
    // But then there's an extra </div> we added.
    content = content.replace(/<\/div>\n    \)\n\n  if/g, ')\n\n  if');
    
    fs.writeFileSync(file, content);
}

// Since the files are already corrupted by the previous script, it's safer to recopy them and run a clean script!
