import ComparePage from './pages/ComparePage';
import BuildsHub from './pages/BuildsHub';
import PlannerPage from './pages/PlannerPage';
import MatchesPage from './pages/MatchesPage';
import MatchPage from './pages/MatchPage';
import StreamsPage from './pages/StreamsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import RanksPage from './pages/RanksPage';
import { Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Home from './pages/Home';
import HeroDirectory from './pages/HeroDirectory';
import HeroPage from './pages/HeroPage';
import ItemsPage from './pages/ItemsPage';
import PlayerPage from './pages/PlayerPage';
import PlayerLookup from './pages/PlayerLookup';
import AboutPage from './pages/AboutPage';
import TierListPage from './pages/TierListPage';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/heroes" element={<HeroDirectory />} />
        <Route path="/tiers" element={<TierListPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/ranks" element={<RanksPage />} />
        <Route path="/builds" element={<BuildsHub />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/streams" element={<StreamsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/compare/:a" element={<ComparePage />} />
        <Route path="/compare/:a/:b" element={<ComparePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/hero/:slug" element={<HeroPage />} />
        <Route path="/player" element={<PlayerLookup />} />
        <Route path="/player/:accountId" element={<PlayerPage />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}
