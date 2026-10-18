import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles/base.css';
import './styles/shell.css';
import './styles/pages.css';
import './styles/city.css';
import './styles/player.css';
import './styles/hero-cards.css';
import './styles/match.css';
import './styles/tier-tags.css';
import './styles/textures.css';
import './styles/city-assets.css';
import './styles/vitals.css';
import './styles/tilt.css';
import { initTheme } from './lib/theme';
import { loadLiveHeroColors } from './data/heroColors';

initTheme();
void loadLiveHeroColors();

const Router = __STANDALONE__ ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
