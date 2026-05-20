const fs = require('fs');
function scope(file, wrapper) {
    let css = fs.readFileSync(file, 'utf8');
    css = css.replace(/^([^{}]+)\s*\{/gm, (match, selectors) => {
        if (selectors.trim().startsWith('@')) return match;
        if (selectors.trim() === ':root') return match;
        const scoped = selectors.split(',').map(s => `.${wrapper} ${s.trim()}`).join(', ');
        return `${scoped} {`;
    });
    fs.writeFileSync(file, css);
}
scope('src/games/easy.css', 'easy-game-wrapper');
scope('src/games/medium.css', 'medium-game-wrapper');
