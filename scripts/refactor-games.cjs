const fs = require('fs');

function refactor(file, name, wrapperClass, cssFile) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Change function name and add props
    content = content.replace(/function App\(\) \{/, `export default function ${name}({ onHome }) {`);
    
    // Change default view to game
    content = content.replace(/useState\('menu'\)/, "useState('game')");
    
    // Change home button click
    content = content.replace(/onClick=\{.*?setCurrentView\('menu'\).*?\}/g, "onClick={onHome}");
    
    // Import CSS
    if (cssFile) {
        content = `import './${cssFile}';\n` + content;
    }

    // Wrap renderGame in wrapper class
    content = content.replace(/const renderGame = \(\) => \(/, `const renderGame = () => (\n    <div className="${wrapperClass}">`);
    
    // Find where renderGame ends and add closing div.
    // It's a bit tricky to find the end with regex, but we can wrap the usage of renderGame.
    // Instead of wrapping renderGame definition, let's wrap where it's called!
    // In currentView === 'game', it returns <div className="view-container">...
    // Actually, let's just wrap the whole returned JSX of `currentView === 'game'`:
    content = content.replace(/if \(currentView === 'game'\) \{\s*return \(\s*<>/, `if (currentView === 'game') {\n    return (\n      <div className="${wrapperClass}">`);
    
    // The closing tag for currentView === 'game' is usually `</>\n  )`
    content = content.replace(/<\/>\s*\)\s*if/g, `</div>\n    )\n\n  if`);
    // Or just manually replace: 
    content = content.replace(/<\/>\s*\)/g, `</div>\n    )`);
    
    fs.writeFileSync(file, content);
}

refactor('src/games/EasyGame.jsx', 'EasyGame', 'easy-game-wrapper', 'easy.css');
refactor('src/games/MediumGame.jsx', 'MediumGame', 'medium-game-wrapper', 'medium.css');
refactor('src/games/HardGame.jsx', 'HardGame', 'hard-game-wrapper', null);

