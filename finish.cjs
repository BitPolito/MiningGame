const fs = require('fs');

function rebuild(src, dest, name, wrapperClass) {
    let content = fs.readFileSync(src, 'utf8');
    
    content = content.replace(/function App\(\) \{/, `export default function ${name}({ onHome }) {`);
    content = content.replace(/import aboutusContent.*?;\n/g, '');
    content = content.replace(/import readmeContent.*?;\n/g, '');
    
    // Replace internal view state
    content = content.replace(/const \[currentView, setCurrentView\] = useState\('menu'\)/g, "const [currentView, setCurrentView] = useState('game')");
    content = content.replace(/onClick=\{.*?setCurrentView\('menu'\).*?\}/g, "onClick={onHome}");
    
    // Find where the main render is. For these, it's:
    // if (currentView === 'menu') {
    let idx = content.indexOf("if (currentView === 'menu') {");
    if (idx !== -1) {
        content = content.substring(0, idx);
    }
    
    // Close the component
    content += `
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

    // Make sure we include the css import
    let cssFile = name === 'EasyGame' ? 'easy.css' : 'medium.css';
    content = `import './${cssFile}';\n` + content;
    
    fs.writeFileSync(dest, content);
}

rebuild('../blockgame/src/App.jsx', 'src/games/EasyGame.jsx', 'EasyGame', 'easy-game-wrapper');
rebuild('../2blockgame/src/App.jsx', 'src/games/MediumGame.jsx', 'MediumGame', 'medium-game-wrapper');

