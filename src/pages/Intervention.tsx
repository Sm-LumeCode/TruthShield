import { useState, useMemo, useEffect } from 'react';
import { type User } from '../context/AppContext';
import { useAppContext } from '../context/useAppContext';
import { TrendingDown, Target, Loader2, Users, Play, Pause, SkipForward, RotateCcw, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const COMMUNITY_COLORS: Record<number, string> = {
  1: '#E8453C', 2: '#4A90D9', 3: '#2ECC71', 4: '#F5A623', 5: '#9B59B6',
};

type ResultType = {
  strategy: string;
  protectedIds: string[];
  infectedCount: number;
  reductionPct: number;
  waves: string[][];
};

export default function Intervention() {
  const { users, edges, addHistory, notify } = useAppContext();
  
  const [budgetK, setBudgetK] = useState<number>(5);
  const [sourceNode, setSourceNode] = useState<string>(users[0]?.id || '');
  const [spreadProb, setSpreadProb] = useState<number>(0.3);

  // Results state
  const [baselineCount, setBaselineCount] = useState<number>(0);
  const [baselineWaves, setBaselineWaves] = useState<string[][]>([]);
  const [randomResult, setRandomResult] = useState<ResultType | null>(null);
  const [degreeResult, setDegreeResult] = useState<ResultType | null>(null);
  const [greedyResult, setGreedyResult] = useState<ResultType | null>(null);
  const [isGreedyRunning, setIsGreedyRunning] = useState(false);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hoveredUserDegree, setHoveredUserDegree] = useState<User | null>(null);
  const [hoveredUserGreedy, setHoveredUserGreedy] = useState<User | null>(null);

  const traversableAdj = useMemo(() => {
    const adj = new Map<string, string[]>();
    users.forEach(u => adj.set(u.id, []));
    edges.forEach(e => {
      // eslint-disable-next-line react-hooks/purity
      if (Math.random() < spreadProb) {
        adj.get(e.source)!.push(e.target);
      }
    });
    return adj;
  }, [users, edges, spreadProb]);

  const simulateReachability = (source: string, protectedSet: Set<string>, adj: Map<string, string[]>) => {
    if (protectedSet.has(source)) return { count: 0, waves: [] };
    const infected = new Set<string>([source]);
    const waves: string[][] = [[source]];
    let currentWave = [source];
    
    while (currentWave.length > 0) {
      const nextWave: string[] = [];
      for (const node of currentWave) {
        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
          if (!infected.has(neighbor) && !protectedSet.has(neighbor)) {
            infected.add(neighbor);
            nextWave.push(neighbor);
          }
        }
      }
      if (nextWave.length > 0) waves.push(nextWave);
      currentWave = nextWave;
    }
    return { count: infected.size, waves };
  };

  useEffect(() => {
    if (!sourceNode) return;
    const { count, waves } = simulateReachability(sourceNode, new Set(), traversableAdj);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaselineCount(count);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaselineWaves(waves);
    
    setRandomResult(null);
    setDegreeResult(null);
    setGreedyResult(null);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [sourceNode, spreadProb, traversableAdj]);

  const runRandom = () => {
    const validUsers = users.filter(u => u.id !== sourceNode);
    const randomIds = validUsers.sort(() => 0.5 - Math.random()).slice(0, budgetK).map(u => u.id);
    const pSet = new Set(randomIds);
    const { count, waves } = simulateReachability(sourceNode, pSet, traversableAdj);
    setRandomResult({
      strategy: 'Random', protectedIds: randomIds, infectedCount: count, reductionPct: baselineCount > 0 ? ((baselineCount - count) / baselineCount) * 100 : 0, waves
    });
  };

  const runDegree = () => {
    const inDegrees = new Map<string, number>();
    users.forEach(u => inDegrees.set(u.id, 0));
    edges.forEach(e => inDegrees.set(e.target, inDegrees.get(e.target)! + 1));
    
    // Explicitly exclude sourceNode from being selected
    const sorted = [...users].filter(u => u.id !== sourceNode).sort((a, b) => inDegrees.get(b.id)! - inDegrees.get(a.id)!);
    const selectedIds = sorted.slice(0, budgetK).map(u => u.id);
    
    const pSet = new Set(selectedIds);
    const { count, waves } = simulateReachability(sourceNode, pSet, traversableAdj);
    
    const reduction = baselineCount > 0 ? ((baselineCount - count) / baselineCount) * 100 : 0;
    setDegreeResult({ strategy: 'Degree Centrality', protectedIds: selectedIds, infectedCount: count, reductionPct: reduction, waves });
    addHistory({ strategy: 'Degree Centrality', infectedCount: count, reduction: `↓ ${reduction.toFixed(1)}%` });
    notify(`🛡️ Degree Centrality applied — ${reduction.toFixed(1)}% reduction`);
    
    runRandom();
    setCurrentStep(0);
  };

  const runGreedy = () => {
    setIsGreedyRunning(true);
    setTimeout(() => {
      const selected = new Set<string>();
      
      for (let i = 0; i < budgetK; i++) {
        let bestNode = '';
        let minInfected = Infinity;
        
        for (const user of users) {
          if (!selected.has(user.id) && user.id !== sourceNode) { // Ignore Patient Zero
            selected.add(user.id);
            const { count } = simulateReachability(sourceNode, selected, traversableAdj);
            if (count < minInfected) {
              minInfected = count;
              bestNode = user.id;
            }
            selected.delete(user.id);
          }
        }
        if (bestNode) selected.add(bestNode);
      }

      const selectedIds = Array.from(selected);
      const { count: finalCount, waves } = simulateReachability(sourceNode, selected, traversableAdj);
      
      const reduction = baselineCount > 0 ? ((baselineCount - finalCount) / baselineCount) * 100 : 0;
      setGreedyResult({ strategy: 'Greedy Optimization', protectedIds: selectedIds, infectedCount: finalCount, reductionPct: reduction, waves });
      setIsGreedyRunning(false);
      
      addHistory({ strategy: 'Greedy Algorithm', infectedCount: finalCount, reduction: `↓ ${reduction.toFixed(1)}%` });
      notify(`🛡️ Greedy intervention applied — ${reduction.toFixed(1)}% reduction`);
      
      if (!randomResult) runRandom();
      setCurrentStep(0);
    }, 500);
  };

  // --- Animation Layout ---
  const layout = useMemo(() => {
    const width = 400;
    const height = 240;
    const nodes: { id: string, x: number, y: number, user: User, level: number }[] = [];
    const links: { source: string, target: string, sourceX: number, sourceY: number, targetX: number, targetY: number }[] = [];
    
    if (baselineWaves.length === 0) return { nodes, links };
    const totalLevels = Math.max(baselineWaves.length, 1);
    const yStep = height / (totalLevels + 1);

    baselineWaves.forEach((wave, level) => {
      const y = (level + 1) * yStep;
      const count = wave.length;
      const xStep = width / (count + 1);
      
      wave.forEach((nodeId, idx) => {
        const x = (idx + 1) * xStep;
        const user = users.find(u => u.id === nodeId);
        if (user) nodes.push({ id: nodeId, x, y, user, level });
      });
    });

    nodes.forEach(t => {
      if (t.level === 0) return;
      const possibleSources = nodes.filter(n => n.level === t.level - 1);
      const incomingEdges = edges.filter(e => e.target === t.id && possibleSources.some(s => s.id === e.source));
      if (incomingEdges.length > 0) {
        const e = incomingEdges[0];
        const s = nodes.find(n => n.id === e.source);
        if (s) links.push({ source: s.id, target: t.id, sourceX: s.x, sourceY: s.y, targetX: t.x, targetY: t.y });
      }
    });

    return { nodes, links };
  }, [baselineWaves, users, edges]);

  const maxSteps = Math.max(baselineWaves.length, degreeResult?.waves.length ?? 0, greedyResult?.waves.length ?? 0) - 1;
  const isSimFinished = currentStep >= maxSteps;

  useEffect(() => {
    if (!isPlaying) return;
    if (isSimFinished) { setIsPlaying(false); return; }
    const timer = setTimeout(() => setCurrentStep(prev => prev + 1), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, isSimFinished]);

  const getInfectedAtStep = (waves: string[][], step: number) => {
    const s = new Set<string>();
    for (let i = 0; i <= step; i++) waves[i]?.forEach(id => s.add(id));
    return s;
  };

  const degreeInfected = useMemo(() => degreeResult ? getInfectedAtStep(degreeResult.waves, currentStep) : new Set<string>(), [degreeResult, currentStep]);
  const greedyInfected = useMemo(() => greedyResult ? getInfectedAtStep(greedyResult.waves, currentStep) : new Set<string>(), [greedyResult, currentStep]);
  const degreeProtected = new Set(degreeResult?.protectedIds ?? []);
  const greedyProtected = new Set(greedyResult?.protectedIds ?? []);

  const renderResultBadge = (res: ResultType) => (
    <div className="flex items-center gap-1 bg-shieldGreen/10 text-shieldGreen px-2 py-1 rounded text-sm font-bold border border-shieldGreen/20">
      <TrendingDown className="w-4 h-4" />
      {res.reductionPct.toFixed(1)}%
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-full p-2 overflow-y-auto pb-10">
      <div>
        <h2 className="text-2xl font-semibold text-white tracking-tight">Intervention Strategies</h2>
        <p className="text-sm text-gray-400 mt-1">Compare algorithmic approaches to halting misinformation propagation. Watch the spread simulation live.</p>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Budget (K Nodes)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="1" max="10" step="1" value={budgetK} onChange={(e) => setBudgetK(parseInt(e.target.value))} className="flex-1 accent-shieldBlue" />
            <span className="text-white font-bold text-xl">{budgetK}</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Source User (Patient Zero)</label>
          <select value={sourceNode} onChange={(e) => setSourceNode(e.target.value)} className="w-full bg-background border border-white/10 rounded-md text-sm text-white px-3 py-2 outline-none focus:border-shieldBlue">
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Baseline Spread Probability</label>
          <div className="flex items-center gap-4">
            <input type="range" min="0.1" max="1.0" step="0.1" value={spreadProb} onChange={(e) => setSpreadProb(parseFloat(e.target.value))} className="flex-1 accent-shieldRed" />
            <span className="text-white font-bold text-xl">{(spreadProb * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Animation Playback Controls */}
      {(degreeResult || greedyResult) && (
        <div className="flex items-center justify-between gap-4 bg-surface border border-white/5 rounded-xl px-6 py-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying(!isPlaying)} disabled={isSimFinished && !isPlaying} className="p-2 bg-shieldBlue hover:bg-shieldBlue/90 disabled:opacity-50 text-white rounded-md transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => { if (currentStep < maxSteps) setCurrentStep(p => p + 1); }} disabled={isPlaying || isSimFinished} className="p-2 bg-background hover:bg-background/80 border border-white/10 text-white rounded-md transition-colors disabled:opacity-40">
              <SkipForward className="w-5 h-5" />
            </button>
            <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }} className="p-2 bg-background hover:bg-background/80 border border-white/10 text-white rounded-md transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-gray-400">Simulation Step: <strong className="text-white text-lg">{currentStep}</strong> / {maxSteps}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy 1: Degree Centrality */}
        <div className="bg-surface border border-shieldBlue/30 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-lg shadow-shieldBlue/5">
          <div className="absolute top-0 right-0 p-3 bg-shieldBlue/10 rounded-bl-xl text-shieldBlue text-xs font-bold font-mono">O(V + E)</div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-shieldBlue/20 text-shieldBlue rounded-lg"><Users className="w-6 h-6" /></div>
            <h3 className="text-xl font-semibold text-white">Degree Centrality</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Disables reshares for users with the highest number of followers to cut off major distribution hubs.</p>
          
          <button onClick={runDegree} className="w-full py-3 bg-shieldBlue hover:bg-shieldBlue/90 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(74,144,217,0.3)] mb-6">
            Apply Degree Centrality
          </button>

          {degreeResult && (
            <div className="flex-1 bg-background rounded-lg border border-white/5 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Current Infections</p>
                  <p className="text-3xl font-bold text-white">{degreeInfected.size} <span className="text-sm text-gray-500 font-normal">/ {baselineCount} final baseline</span></p>
                </div>
                {renderResultBadge(degreeResult)}
              </div>

              {/* Animated Graph */}
              <div className="bg-surface border border-white/5 rounded-xl p-3 relative h-[260px] flex flex-col justify-end">
                <svg viewBox="0 0 400 240" className="absolute top-0 left-0 w-full h-[240px]">
                  {layout.links.map((link, i) => {
                    const sInfected = degreeInfected.has(link.source);
                    const tInfected = degreeInfected.has(link.target);
                    const isActive = sInfected && tInfected;
                    const isBlocked = sInfected && degreeProtected.has(link.target);
                    return (
                      <g key={i}>
                        <line x1={link.sourceX} y1={link.sourceY} x2={link.targetX} y2={link.targetY} stroke={isActive ? '#E8453C' : '#333'} strokeWidth={isActive ? 2 : 1} opacity={isActive ? 1 : 0.3} strokeDasharray={isBlocked ? "4 4" : "none"} />
                        {isBlocked && <text x={(link.sourceX + link.targetX)/2} y={(link.sourceY + link.targetY)/2 - 4} fill="#4A90D9" fontSize="9" textAnchor="middle" fontWeight="bold">blocked</text>}
                      </g>
                    );
                  })}
                  {layout.nodes.map(node => {
                    const infected = degreeInfected.has(node.id);
                    const protected_ = degreeProtected.has(node.id);
                    const isSource = node.id === sourceNode;
                    return (
                      <g key={node.id} onMouseEnter={() => setHoveredUserDegree(node.user)} onMouseLeave={() => setHoveredUserDegree(null)}>
                        <circle cx={node.x} cy={node.y} r={isSource ? 8 : (protected_ ? 8 : 6)} fill={infected ? '#E8453C' : protected_ ? '#4A90D9' : (COMMUNITY_COLORS[node.user.community] ?? '#9CA3AF')} stroke={protected_ ? '#4A90D9' : '#111'} strokeWidth={protected_ ? 2 : 1} className={cn("transition-all duration-300 cursor-pointer", infected && "drop-shadow-[0_0_6px_#E8453C]")} />
                        {protected_ && <text x={node.x} y={node.y + 3} fontSize="8" textAnchor="middle" fill="#fff">🛑</text>}
                      </g>
                    );
                  })}
                </svg>
                <div className="z-10 text-[11px] text-textSecondary bg-background/80 backdrop-blur-sm border border-white/5 rounded p-1.5 h-7 flex items-center justify-center text-center">
                  {hoveredUserDegree
                    ? <span className="flex gap-2"><span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[hoveredUserDegree.community] }} /><strong>{hoveredUserDegree.name}</strong> · <strong className={degreeProtected.has(hoveredUserDegree.id) ? 'text-shieldBlue' : degreeInfected.has(hoveredUserDegree.id) ? 'text-shieldRed' : 'text-gray-400'}>{degreeProtected.has(hoveredUserDegree.id) ? '🛑 Reshare Disabled' : degreeInfected.has(hoveredUserDegree.id) ? 'Infected' : 'Safe'}</strong></span>
                    : <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Hover a node to see status</span>
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strategy 2: Greedy */}
        <div className="bg-surface border border-shieldRed/30 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-lg shadow-shieldRed/5">
          <div className="absolute top-0 right-0 p-3 bg-shieldRed/10 rounded-bl-xl text-shieldRed text-xs font-bold font-mono">O(k · V · (V+E))</div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-shieldRed/20 text-shieldRed rounded-lg"><Target className="w-6 h-6" /></div>
            <h3 className="text-xl font-semibold text-white">Greedy Containment</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Iteratively selects the exact structural nodes where disabling reshares provides the maximum reduction in viral spread.</p>

          <button onClick={runGreedy} disabled={isGreedyRunning} className="w-full py-3 bg-shieldRed hover:bg-shieldRed/90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(232,69,60,0.3)] flex justify-center items-center gap-2 mb-6">
            {isGreedyRunning ? <><Loader2 className="w-5 h-5 animate-spin" /> Simulating Paths...</> : 'Apply Greedy Algorithm'}
          </button>

          {greedyResult && !isGreedyRunning && (
            <div className="flex-1 bg-background rounded-lg border border-white/5 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Current Infections</p>
                  <p className="text-3xl font-bold text-white">{greedyInfected.size} <span className="text-sm text-gray-500 font-normal">/ {baselineCount} final baseline</span></p>
                </div>
                {renderResultBadge(greedyResult)}
              </div>

              {/* Animated Graph */}
              <div className="bg-surface border border-white/5 rounded-xl p-3 relative h-[260px] flex flex-col justify-end">
                <svg viewBox="0 0 400 240" className="absolute top-0 left-0 w-full h-[240px]">
                  {layout.links.map((link, i) => {
                    const sInfected = greedyInfected.has(link.source);
                    const tInfected = greedyInfected.has(link.target);
                    const isActive = sInfected && tInfected;
                    const isBlocked = sInfected && greedyProtected.has(link.target);
                    return (
                      <g key={i}>
                        <line x1={link.sourceX} y1={link.sourceY} x2={link.targetX} y2={link.targetY} stroke={isActive ? '#E8453C' : '#333'} strokeWidth={isActive ? 2 : 1} opacity={isActive ? 1 : 0.3} strokeDasharray={isBlocked ? "4 4" : "none"} />
                        {isBlocked && <text x={(link.sourceX + link.targetX)/2} y={(link.sourceY + link.targetY)/2 - 4} fill="#9B59B6" fontSize="9" textAnchor="middle" fontWeight="bold">blocked</text>}
                      </g>
                    );
                  })}
                  {layout.nodes.map(node => {
                    const infected = greedyInfected.has(node.id);
                    const protected_ = greedyProtected.has(node.id);
                    const isSource = node.id === sourceNode;
                    return (
                      <g key={node.id} onMouseEnter={() => setHoveredUserGreedy(node.user)} onMouseLeave={() => setHoveredUserGreedy(null)}>
                        <circle cx={node.x} cy={node.y} r={isSource ? 8 : (protected_ ? 8 : 6)} fill={infected ? '#E8453C' : protected_ ? '#9B59B6' : (COMMUNITY_COLORS[node.user.community] ?? '#9CA3AF')} stroke={protected_ ? '#9B59B6' : '#111'} strokeWidth={protected_ ? 2 : 1} className={cn("transition-all duration-300 cursor-pointer", infected && "drop-shadow-[0_0_6px_#E8453C]")} />
                        {protected_ && <text x={node.x} y={node.y + 3} fontSize="8" textAnchor="middle" fill="#fff">🛑</text>}
                      </g>
                    );
                  })}
                </svg>
                <div className="z-10 text-[11px] text-textSecondary bg-background/80 backdrop-blur-sm border border-white/5 rounded p-1.5 h-7 flex items-center justify-center text-center">
                  {hoveredUserGreedy
                    ? <span className="flex gap-2"><span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: COMMUNITY_COLORS[hoveredUserGreedy.community] }} /><strong>{hoveredUserGreedy.name}</strong> · <strong className={greedyProtected.has(hoveredUserGreedy.id) ? 'text-shieldPurple' : greedyInfected.has(hoveredUserGreedy.id) ? 'text-shieldRed' : 'text-gray-400'}>{greedyProtected.has(hoveredUserGreedy.id) ? '🛑 Reshare Disabled' : greedyInfected.has(hoveredUserGreedy.id) ? 'Infected' : 'Safe'}</strong></span>
                    : <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Hover a node to see status</span>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
