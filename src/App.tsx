import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Rss, Network, Activity, ShieldAlert, BarChart3, CheckCircle2, Sun, Moon, Info, X, Users, Target, UserCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import SocialFeed from './pages/SocialFeed';
import NetworkGraph from './pages/NetworkGraph';
import SpreadSim from './pages/SpreadSim';
import Intervention from './pages/Intervention';
import Analytics from './pages/Analytics';
import { cn } from './lib/utils';
import { useAppContext } from './context/useAppContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/social-feed', label: 'Social Feed', icon: Rss },
  { path: '/network-graph', label: 'Network Graph', icon: Network },
  { path: '/spread-sim', label: 'Spread Sim', icon: Activity },
  { path: '/intervention', label: 'Intervention', icon: ShieldAlert },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const COMMUNITY_COLORS_APP: Record<number, string> = {
  1: '#E8453C', 2: '#4A90D9', 3: '#2ECC71', 4: '#F5A623', 5: '#9B59B6',
};

function App() {
  const { theme, toggleTheme, notification, currentUser } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'r') navigate('/spread-sim');
      if (e.key.toLowerCase() === 'i') navigate('/intervention');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-textPrimary">
      {/* Top Notification Bar */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-shieldBlue text-white text-center py-2 px-4 shadow-md font-medium text-sm flex items-center justify-center gap-2"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="h-16 bg-surface border-b border-borderColor flex items-center justify-between px-4 md:px-6 shrink-0 relative z-40">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-shieldRed fill-shieldRed/20" />
          <h1 className="text-xl font-bold tracking-tight">TruthShield</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <span className="hidden md:inline-block text-xs text-textSecondary bg-background px-2 py-1 rounded border border-borderColor">
            Shortcuts: <kbd className="font-mono font-bold">R</kbd> Run, <kbd className="font-mono font-bold">I</kbd> Intervene
          </span>
          <button 
            onClick={() => setShowHowItWorks(true)}
            className="p-2 hover:bg-background rounded-full transition-colors text-textSecondary hover:text-textPrimary"
            title="How it Works"
          >
            <Info className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-background rounded-full transition-colors text-textSecondary hover:text-textPrimary"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {currentUser ? (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-shieldBlue/40 ml-2 text-xs font-bold text-white"
              style={{ backgroundColor: COMMUNITY_COLORS_APP[parseInt(currentUser.id.replace('u','')) % 5 + 1] ?? '#4A90D9' }}
              title={`Logged in as ${currentUser.name} (@${currentUser.username})`}
            >
              {currentUser.avatar.length > 2 ? currentUser.avatar.slice(0,2) : currentUser.avatar}
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center border border-borderColor ml-2" title="Not logged in">
              <UserCircle2 className="w-5 h-5 text-textSecondary" />
            </div>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-borderColor flex md:flex-col shrink-0 overflow-x-auto md:overflow-y-auto">
          <nav className="flex md:flex-col flex-1 px-3 py-2 md:py-4 space-x-2 md:space-x-0 md:space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-shieldRed/10 text-shieldRed" 
                    : "text-textSecondary hover:bg-background hover:text-textPrimary"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline-block">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Page Content with Transitions */}
        <main className="flex-1 overflow-y-auto relative p-4 md:p-6 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/social-feed" element={<SocialFeed />} />
                <Route path="/network-graph" element={<NetworkGraph />} />
                <Route path="/spread-sim" element={<SpreadSim />} />
                <Route path="/intervention" element={<Intervention />} />
                <Route path="/analytics" element={<Analytics />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-surface border-t border-borderColor flex items-center justify-between px-4 shrink-0 text-xs text-textSecondary">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-shieldGreen" />
          <span>System Ready</span>
        </div>
        <div className="hidden md:block">
          TruthShield · Design & Analysis of Algorithms · Graph Algorithms · Social Network Simulation
        </div>
      </footer>

      {/* How it Works Modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-surface border border-borderColor rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
            >
              <button onClick={() => setShowHowItWorks(false)} className="absolute top-4 right-4 p-2 text-textSecondary hover:text-textPrimary bg-background rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-shieldRed" /> How TruthShield Works
              </h2>
              
              <div className="space-y-6 text-sm text-textSecondary">
                <section>
                  <h3 className="text-lg font-semibold text-textPrimary mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-shieldRed"/> Spread Simulation (BFS)</h3>
                  <p>Misinformation spreads using Breadth-First Search (BFS). Starting from Patient Zero, fake news travels to connected followers. Each connection has a `Spread Probability` of transmitting the infection. The traversal calculates the total reach across discrete time steps.</p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-textPrimary mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-shieldBlue"/> Degree Centrality</h3>
                  <p>A fast $O(V+E)$ heuristic. It counts the number of in-bound edges (followers) for every node. We intervene by targeting the top $K$ nodes with the highest degree, removing the network's biggest hubs.</p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-textPrimary mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-shieldGreen"/> Greedy Intervention</h3>
                  <p>An exhaustive $O(K \cdot V \cdot (V+E))$ optimization. It tests every possible node in the network by simulating the entire BFS spread, picking the exact node that provides the maximum marginal reduction in infections, repeating $K$ times.</p>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
