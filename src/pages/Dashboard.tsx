import { useState, useMemo, useEffect } from 'react';
import { type User, type ContainmentResult } from '../context/AppContext';
import { useAppContext } from '../context/useAppContext';
import { Users, Link as LinkIcon, Component, Bug, Play, Activity, ShieldAlert, Clock, ChevronRight, Bot, Pause, SkipForward, RotateCcw, Shield, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const COMMUNITY_COLORS: Record<number, string> = {
  1: '#E8453C', 2: '#4A90D9', 3: '#2ECC71', 4: '#F5A623', 5: '#9B59B6',
};

function SimulationCard({ result, users }: { result: ContainmentResult, users: User[] }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hoveredUserLeft, setHoveredUserLeft] = useState<User | null>(null);
  const [hoveredUserRight, setHoveredUserRight] = useState<User | null>(null);

  const { leftWaves, rightWaves, protectedIds, authorId, budgetK, claim, explanation } = result;
  
  const sortedUsersForGrid = useMemo(() => [...users].sort((a, b) => a.community - b.community), [users]);

  const maxSteps = Math.max(leftWaves.length, rightWaves.length) - 1;
  const isSimFinished = currentStep >= maxSteps;

  useEffect(() => {
    if (!isPlaying) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isSimFinished) { setIsPlaying(false); return; }
    const timer = setTimeout(() => setCurrentStep(prev => prev + 1), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, isSimFinished]);

  const getInfectedAtStep = (waves: string[][], step: number) => {
    const s = new Set<string>();
    for (let i = 0; i <= step; i++) waves[i]?.forEach(id => s.add(id));
    return s;
  };

  const leftInfected = useMemo(() => getInfectedAtStep(leftWaves, currentStep), [leftWaves, currentStep]);
  const rightInfected = useMemo(() => getInfectedAtStep(rightWaves, currentStep), [rightWaves, currentStep]);
  const protectedSet = new Set(protectedIds);

  const leftTotal = leftWaves.flat().length;
  const rightTotal = rightWaves.flat().length;
  const totalSaved = Math.max(0, leftTotal - rightTotal);
  const savedPct = leftTotal > 0 ? (totalSaved / leftTotal) * 100 : 0;

  return (
    <div className="bg-surface border border-shieldRed/30 rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between border-b border-borderColor pb-4 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-shieldRed/10 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-shieldRed animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-textPrimary">⚠️ Misinformation Containment Lab</h3>
            <p className="text-xs text-textSecondary">{result.timestamp.toLocaleString()} · Left: uncontrolled · Right: Degree Centrality (K={budgetK})</p>
          </div>
        </div>
        <button className="p-1.5 hover:bg-background rounded-full text-textSecondary transition-colors">
          {isMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Claim card */}
          <div className="bg-background border border-shieldRed/20 rounded-lg p-4 space-y-2">
            <div className="text-xs font-bold text-shieldRed uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Flagged & Confirmed by Groq
            </div>
            <p className="text-textPrimary font-medium text-sm italic">"{claim}"</p>
            <div className="flex gap-2 text-xs text-textSecondary bg-shieldRed/5 border border-shieldRed/10 rounded p-2.5">
              <Bot className="w-4 h-4 text-shieldBlue shrink-0 mt-0.5" />
              <span><strong className="text-textPrimary">Groq Analysis:</strong> {explanation}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-between gap-4 bg-background/50 border border-borderColor rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isSimFinished && !isPlaying}
                className="p-2 bg-shieldBlue hover:bg-shieldBlue/90 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { if (currentStep < maxSteps) setCurrentStep(p => p + 1); }}
                disabled={isPlaying || isSimFinished}
                className="p-2 bg-surface hover:bg-background border border-borderColor text-textPrimary rounded-md transition-colors disabled:opacity-40"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                className="p-2 bg-surface hover:bg-background border border-borderColor text-textPrimary rounded-md transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-textSecondary">Step <strong className="text-textPrimary">{currentStep}</strong></span>
              <span className="h-4 w-px bg-borderColor" />
              <span className="text-textSecondary">Algorithm: <strong className="text-shieldBlue">Degree Centrality</strong></span>
            </div>
          </div>

          {/* Side-by-side grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-textPrimary flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-shieldRed animate-ping" />
                    No Mitigation
                  </h4>
                  <p className="text-xs text-textSecondary">Fake news spreads freely</p>
                </div>
                <span className="text-xl font-black text-shieldRed">{leftInfected.size} <span className="text-xs font-normal text-textSecondary">infected</span></span>
              </div>
              <div className="h-2 bg-background border border-borderColor rounded-full overflow-hidden">
                <div className="h-full bg-shieldRed transition-all duration-500" style={{ width: `${(leftInfected.size / Math.max(users.length, 1)) * 100}%` }} />
              </div>
              <div className="bg-background border border-borderColor rounded-xl p-3">
                <div className="grid grid-cols-10 gap-1.5 justify-items-center">
                  {sortedUsersForGrid.map(u => {
                    const infected = leftInfected.has(u.id);
                    const isSource = u.id === authorId;
                    return (
                      <div
                        key={u.id}
                        onMouseEnter={() => setHoveredUserLeft(u)}
                        onMouseLeave={() => setHoveredUserLeft(null)}
                        className={cn("w-4 h-4 rounded-full border border-black/10 transition-all duration-300 cursor-help hover:scale-125 relative", infected && "scale-110 shadow-[0_0_6px_#E8453C]")}
                        style={{ backgroundColor: infected ? '#E8453C' : COMMUNITY_COLORS[u.community] ?? '#9CA3AF' }}
                      >
                        {isSource && <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white">★</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-textSecondary bg-surface/50 border border-borderColor rounded p-1.5 h-8 flex items-center justify-center text-center overflow-hidden">
                  {hoveredUserLeft
                    ? <span className="flex gap-2"><span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[hoveredUserLeft.community] }} /><strong>{hoveredUserLeft.name}</strong> · <strong className={leftInfected.has(hoveredUserLeft.id) ? 'text-shieldRed' : 'text-shieldGreen'}>{leftInfected.has(hoveredUserLeft.id) ? 'Infected' : 'Safe'}</strong></span>
                    : <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Hover a node</span>
                  }
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-textPrimary flex items-center gap-2">
                    <Shield className="w-4 h-4 text-shieldGreen fill-shieldGreen/20" />
                    Degree Centrality Shield
                  </h4>
                  <p className="text-xs text-textSecondary">Top {budgetK} hubs immunized</p>
                </div>
                <span className="text-xl font-black text-shieldGreen">{rightInfected.size} <span className="text-xs font-normal text-textSecondary">infected</span></span>
              </div>
              <div className="h-2 bg-background border border-borderColor rounded-full overflow-hidden">
                <div className="h-full bg-shieldGreen transition-all duration-500" style={{ width: `${(rightInfected.size / Math.max(users.length, 1)) * 100}%` }} />
              </div>
              <div className="bg-background border border-borderColor rounded-xl p-3">
                <div className="grid grid-cols-10 gap-1.5 justify-items-center">
                  {sortedUsersForGrid.map(u => {
                    const infected = rightInfected.has(u.id);
                    const protected_ = protectedSet.has(u.id);
                    const isSource = u.id === authorId;
                    return (
                      <div
                        key={u.id}
                        onMouseEnter={() => setHoveredUserRight(u)}
                        onMouseLeave={() => setHoveredUserRight(null)}
                        className={cn("w-4 h-4 rounded-full border border-black/10 transition-all duration-300 cursor-help hover:scale-125 relative", infected && "scale-110 shadow-[0_0_6px_#E8453C]", protected_ && !infected && "ring-1 ring-shieldGreen/60 scale-105")}
                        style={{ backgroundColor: infected ? '#E8453C' : protected_ ? '#2ECC71' : COMMUNITY_COLORS[u.community] ?? '#9CA3AF' }}
                      >
                        {isSource && <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white">★</span>}
                        {protected_ && !infected && <span className="absolute inset-0 flex items-center justify-center text-[8px]">🛡</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-textSecondary bg-surface/50 border border-borderColor rounded p-1.5 h-8 flex items-center justify-center text-center overflow-hidden">
                  {hoveredUserRight
                    ? <span className="flex gap-2"><span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[hoveredUserRight.community] }} /><strong>{hoveredUserRight.name}</strong> · <strong className={protectedSet.has(hoveredUserRight.id) ? 'text-shieldGreen' : rightInfected.has(hoveredUserRight.id) ? 'text-shieldRed' : 'text-textSecondary'}>{protectedSet.has(hoveredUserRight.id) ? '🛡 Shielded' : rightInfected.has(hoveredUserRight.id) ? 'Infected' : 'Safe'}</strong></span>
                    : <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Hover a node</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {isSimFinished && (
            <div className="bg-shieldGreen/5 border border-shieldGreen/20 rounded-xl p-5 space-y-4 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-shieldGreen" />
                <h4 className="font-bold text-textPrimary">Containment Analysis Complete</h4>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-surface border border-borderColor rounded-lg p-3">
                  <p className="text-xs text-textSecondary mb-1">Without Algorithm</p>
                  <p className="text-2xl font-black text-shieldRed">{leftTotal}</p>
                </div>
                <div className="bg-surface border border-borderColor rounded-lg p-3">
                  <p className="text-xs text-textSecondary mb-1">With Algorithm</p>
                  <p className="text-2xl font-black text-shieldGreen">{rightTotal}</p>
                </div>
                <div className="bg-surface border border-borderColor rounded-lg p-3">
                  <p className="text-xs text-textSecondary mb-1">Nodes Saved</p>
                  <p className="text-2xl font-black text-shieldBlue">{savedPct.toFixed(0)}%</p>
                </div>
                <div className="bg-surface border border-borderColor rounded-lg p-3">
                  <p className="text-xs text-textSecondary mb-1">Warnings Sent</p>
                  <p className="text-2xl font-black text-shieldOrange">{result.sharerIds.length}</p>
                </div>
              </div>
              <p className="text-sm text-textSecondary">
                By immunizing the top <strong>{budgetK}</strong> most-connected accounts, the algorithm blocked <strong>{totalSaved}</strong> additional users from receiving this misinformation.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { users, edges, history, containmentResults } = useAppContext();

  // Compute live stats
  const totalUsers = users.length;
  const totalEdges = edges.length;
  const numCommunities = new Set(users.map(u => u.community)).size;
  const totalInfected = users.filter(u => u.isInfected).length;

  const stats = [
    { label: 'Users', value: totalUsers.toString(), icon: Users, color: 'text-shieldBlue', borderColor: 'border-shieldBlue/50', bgColor: 'bg-shieldBlue/10' },
    { label: 'Connections', value: totalEdges.toString(), icon: LinkIcon, color: 'text-shieldGreen', borderColor: 'border-shieldGreen/50', bgColor: 'bg-shieldGreen/10' },
    { label: 'Communities', value: numCommunities.toString(), icon: Component, color: 'text-shieldOrange', borderColor: 'border-shieldOrange/50', bgColor: 'bg-shieldOrange/10' },
    { label: 'Infected', value: totalInfected.toString(), icon: Bug, color: 'text-shieldRed', borderColor: 'border-shieldRed/50', bgColor: 'bg-shieldRed/10' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full overflow-y-auto pb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-textSecondary mt-1">Overview of the current misinformation simulation network.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className={`bg-surface rounded-xl p-5 border-l-4 ${stat.borderColor} border-y border-r border-y-borderColor border-r-borderColor shadow-sm flex items-center justify-between group hover:bg-background transition-colors`}
          >
            <div>
              <p className="text-sm font-medium text-textSecondary">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Multiple Containment Results */}
      {containmentResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-textPrimary pt-4 border-t border-borderColor">Recent Misinformation Contained</h3>
          {containmentResults.map((result, idx) => (
            <SimulationCard key={`${result.postId}-${idx}`} result={result} users={users} />
          ))}
        </div>
      )}

      {/* Quick Start */}
      <div className="bg-surface rounded-xl p-6 border border-borderColor shadow-sm">
        <h3 className="text-lg font-medium mb-4">Quick Start</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/network-graph" className="flex flex-col items-center justify-center p-6 rounded-lg border border-borderColor bg-background hover:border-shieldBlue/50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-shieldBlue/10 flex items-center justify-center mb-3 group-hover:bg-shieldBlue/20 transition-colors">
              <Activity className="w-5 h-5 text-shieldBlue" />
            </div>
            <span className="font-medium text-textPrimary">Analyze Network</span>
            <span className="text-xs text-textSecondary mt-1 text-center">Detect Communities & Graph</span>
          </Link>
          
          <Link to="/spread-sim" className="flex flex-col items-center justify-center p-6 rounded-lg border border-borderColor bg-background hover:border-shieldRed/50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-shieldRed/10 flex items-center justify-center mb-3 group-hover:bg-shieldRed/20 transition-colors">
              <Play className="w-5 h-5 text-shieldRed" />
            </div>
            <span className="font-medium text-textPrimary">Run Simulation</span>
            <span className="text-xs text-textSecondary mt-1 text-center">Start misinformation spread (BFS)</span>
          </Link>

          <Link to="/intervention" className="flex flex-col items-center justify-center p-6 rounded-lg border border-borderColor bg-background hover:border-shieldGreen/50 transition-all group">
            <div className="w-10 h-10 rounded-full bg-shieldGreen/10 flex items-center justify-center mb-3 group-hover:bg-shieldGreen/20 transition-colors">
              <ShieldAlert className="w-5 h-5 text-shieldGreen" />
            </div>
            <span className="font-medium text-textPrimary">Apply Intervention</span>
            <span className="text-xs text-textSecondary mt-1 text-center">Deploy countermeasures</span>
          </Link>
        </div>
      </div>

      {/* Simulation History */}
      <div className="bg-surface rounded-xl p-6 border border-borderColor shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-textSecondary" /> Simulation History
        </h3>
        
        {history.length === 0 ? (
          <div className="text-center py-8 text-textSecondary text-sm bg-background rounded-lg border border-dashed border-borderColor">
            No simulations run yet. Go to Spread Sim or Intervention to start.
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 5).map(run => (
              <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-borderColor hover:border-shieldBlue/30 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-textPrimary flex items-center gap-2">
                    {run.strategy} <ChevronRight className="w-3 h-3 text-textSecondary" /> {run.infectedCount} infected
                  </span>
                  <span className="text-xs text-textSecondary mt-0.5">{run.timestamp.toLocaleTimeString()}</span>
                </div>
                {run.reduction && (
                  <div className="text-xs font-bold bg-shieldGreen/10 text-shieldGreen px-2 py-1 rounded">
                    {run.reduction}
                  </div>
                )}
              </div>
            ))}
            {history.length > 5 && (
              <div className="text-center text-xs text-textSecondary pt-2">
                Showing latest 5 of {history.length} runs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
