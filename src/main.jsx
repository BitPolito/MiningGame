import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/bitpolito.css';
import './styles/light-ui.css';
import './styles/game-spacing.css';
import './styles/game-layout.css';
import './styles/text-colors.css';
import './styles/palette-fixes.css';
import App from './App.jsx';
import { LocaleProvider } from './i18n/LocaleContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
