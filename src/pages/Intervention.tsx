import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import { Zap, TrendingDown, Target, Loader2, Users } from 'lucide-react';

type ResultType = {
  strategy: string;
  protectedIds: string[];
  infectedCount: number;
  reductionPct: number;
};

export default function Intervention() {
  const { users, edges, addHistory, notify } = useAppContext();
  
  const [budgetK, setBudgetK] = useState<number>(5);
  const [sourceNode, setSourceNode] = useState<string>(users[0]?.id || '');
  const [spreadProb, setSpreadProb] = useState<number>(0.3);

  // Results state
  const [baselineCount, setBaselineCount] = useState<number>(0);
  const [randomResult, setRandomResult] = useState<ResultType | null>(null);
  const [degreeResult, setDegreeResult] = useState<ResultType | null>(null);
  const [greedyResult, setGreedyResult] = useState<ResultType | null>(null);
  const [isGreedyRunning, setIsGreedyRunning] = useState(false);

  // Deterministic Graph for stable comparisons
  // Re-generate only when source or spreadProb changes
  const traversableAdj = useMemo(() => {
    const adj = new Map<string, string[]>();
    users.forEach(u => adj.set(u.id, []));
    edges.forEach(e => {
      // Pre-roll the dice for all edges
      // eslint-disable-next-line react-hooks/purity
      if (Math.random() < spreadProb) {
        adj.get(e.source)!.push(e.target);
      }
    });
    return adj;
  }, [users, edges, spreadProb]);

  // Fast deterministic BFS
  const simulateReachability = (source: string, protectedSet: Set<string>, adj: Map<string, string[]>) => {
    if (protectedSet.has(source)) return 0;
    const infected = new Set<string>([source]);
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
      currentWave = nextWave;
    }
    return infected.size;
  };

  // Compute Baseline on mount or parameters change
  useEffect(() => {
    if (!sourceNode) return;
    const count = simulateReachability(sourceNode, new Set(), traversableAdj);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaselineCount(count);
    
    // Clear results on parameters change
    setRandomResult(null);
    setDegreeResult(null);
    setGreedyResult(null);
  }, [sourceNode, spreadProb, traversableAdj]);

  const runRandom = () => {
    const randomIds = [...users].sort(() => 0.5 - Math.random()).slice(0, budgetK).map(u => u.id);
    const pSet = new Set(randomIds);
    const count = simulateReachability(sourceNode, pSet, traversableAdj);
    setRandomResult({
      strategy: 'Random',
      protectedIds: randomIds,
      infectedCount: count,
      reductionPct: baselineCount > 0 ? ((baselineCount - count) / baselineCount) * 100 : 0
    });
  };

  const runDegree = () => {
    // 1. Compute in-degree
    const inDegrees = new Map<string, number>();
    users.forEach(u => inDegrees.set(u.id, 0));
    edges.forEach(e => inDegrees.set(e.target, inDegrees.get(e.target)! + 1));
    
    // 2. Sort and select K
    const sorted = [...users].sort((a, b) => inDegrees.get(b.id)! - inDegrees.get(a.id)!);
    const selectedIds = sorted.slice(0, budgetK).map(u => u.id);
    
    // 3. Simulate
    const pSet = new Set(selectedIds);
    const count = simulateReachability(sourceNode, pSet, traversableAdj);
    
    const reduction = baselineCount > 0 ? ((baselineCount - count) / baselineCount) * 100 : 0;
    setDegreeResult({
      strategy: 'Degree Centrality',
      protectedIds: selectedIds,
      infectedCount: count,
      reductionPct: reduction
    });
    
    addHistory({ strategy: 'Degree Centrality', infectedCount: count, reduction: `↓ ${reduction.toFixed(1)}%` });
    notify(`🛡️ Degree Centrality applied — ${reduction.toFixed(1)}% reduction`);
    
    // Automatically run random baseline for comparison
    runRandom();
  };

  const runGreedy = () => {
    setIsGreedyRunning(true);
    
    // Use setTimeout to allow UI to render spinner
    setTimeout(() => {
      const selected = new Set<string>();
      
      for (let i = 0; i < budgetK; i++) {
        let bestNode = '';
        let minInfected = Infinity;
        
        for (const user of users) {
          if (!selected.has(user.id)) {
            selected.add(user.id);
            const count = simulateReachability(sourceNode, selected, traversableAdj);
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
      const finalCount = simulateReachability(sourceNode, selected, traversableAdj);
      
      const reduction = baselineCount > 0 ? ((baselineCount - finalCount) / baselineCount) * 100 : 0;
      setGreedyResult({
        strategy: 'Greedy Optimization',
        protectedIds: selectedIds,
        infectedCount: finalCount,
        reductionPct: reduction
      });
      setIsGreedyRunning(false);
      
      addHistory({ strategy: 'Greedy Algorithm', infectedCount: finalCount, reduction: `↓ ${reduction.toFixed(1)}%` });
      notify(`🛡️ Greedy intervention applied — ${reduction.toFixed(1)}% reduction`);
      
      if (!randomResult) runRandom();
    }, 500);
  };

  const renderResultBadge = (res: ResultType) => (
    <div className="flex items-center gap-1 bg-shieldGreen/10 text-shieldGreen px-2 py-1 rounded text-sm font-bold border border-shieldGreen/20">
      <TrendingDown className="w-4 h-4" />
      {res.reductionPct.toFixed(1)}%
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-full p-2 overflow-y-auto">
      <div>
        <h2 className="text-2xl font-semibold text-white tracking-tight">Intervention Strategies</h2>
        <p className="text-sm text-gray-400 mt-1">Compare algorithmic approaches to halting misinformation propagation.</p>
      </div>

      {/* Global Configuration */}
      <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Budget (K Nodes)</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="1" max="10" step="1" 
              value={budgetK} onChange={(e) => setBudgetK(parseInt(e.target.value))}
              className="flex-1 accent-shieldBlue"
            />
            <span className="text-white font-bold text-xl">{budgetK}</span>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Source User (Patient Zero)</label>
          <select 
            value={sourceNode}
            onChange={(e) => setSourceNode(e.target.value)}
            className="w-full bg-background border border-white/10 rounded-md text-sm text-white px-3 py-2 outline-none focus:border-shieldBlue"
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Baseline Spread Probability</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="0.1" max="1.0" step="0.1" 
              value={spreadProb} onChange={(e) => setSpreadProb(parseFloat(e.target.value))}
              className="flex-1 accent-shieldRed"
            />
            <span className="text-white font-bold text-xl">{(spreadProb * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy 1: Degree Centrality */}
        <div className="bg-surface border border-shieldBlue/30 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-lg shadow-shieldBlue/5">
          <div className="absolute top-0 right-0 p-3 bg-shieldBlue/10 rounded-bl-xl text-shieldBlue text-xs font-bold font-mono">
            O(V + E)
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-shieldBlue/20 text-shieldBlue rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Degree Centrality</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Protects users with the highest number of followers. Fast heuristic approach targeting hubs.</p>
          
          <button 
            onClick={runDegree}
            className="w-full py-3 bg-shieldBlue hover:bg-shieldBlue/90 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(74,144,217,0.3)] mb-6"
          >
            Apply Degree Centrality
          </button>

          {degreeResult && (
            <div className="flex-1 bg-background rounded-lg border border-white/5 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Resulting Infections</p>
                  <p className="text-3xl font-bold text-white">{degreeResult.infectedCount} <span className="text-sm text-gray-500 font-normal">/ {baselineCount} baseline</span></p>
                </div>
                {renderResultBadge(degreeResult)}
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Protected Targets (K={budgetK})</p>
                <div className="flex flex-wrap gap-2">
                  {degreeResult.protectedIds.map(id => {
                    const u = users.find(x => x.id === id);
                    return (
                      <div key={id} className="bg-surface border border-shieldBlue/20 text-xs px-2 py-1 rounded flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-shieldBlue"></span>
                        {u?.username}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strategy 2: Greedy */}
        <div className="bg-surface border border-shieldRed/30 rounded-xl p-6 flex flex-col relative overflow-hidden shadow-lg shadow-shieldRed/5">
          <div className="absolute top-0 right-0 p-3 bg-shieldRed/10 rounded-bl-xl text-shieldRed text-xs font-bold font-mono">
            O(k · V · (V+E))
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-shieldRed/20 text-shieldRed rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Greedy Intervention</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">Iteratively selects the node that provides the maximum marginal reduction in infection spread.</p>

          <button 
            onClick={runGreedy}
            disabled={isGreedyRunning}
            className="w-full py-3 bg-shieldRed hover:bg-shieldRed/90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(232,69,60,0.3)] flex justify-center items-center gap-2 mb-6"
          >
            {isGreedyRunning ? <><Loader2 className="w-5 h-5 animate-spin" /> Simulating Paths...</> : 'Apply Greedy Algorithm'}
          </button>

          {greedyResult && !isGreedyRunning && (
            <div className="flex-1 bg-background rounded-lg border border-white/5 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Resulting Infections</p>
                  <p className="text-3xl font-bold text-white">{greedyResult.infectedCount} <span className="text-sm text-gray-500 font-normal">/ {baselineCount} baseline</span></p>
                </div>
                {renderResultBadge(greedyResult)}
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Protected Targets (K={budgetK})</p>
                <div className="flex flex-wrap gap-2">
                  {greedyResult.protectedIds.map(id => {
                    const u = users.find(x => x.id === id);
                    return (
                      <div key={id} className="bg-surface border border-shieldRed/20 text-xs px-2 py-1 rounded flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-shieldRed"></span>
                        {u?.username}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-surface border border-white/5 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-shieldOrange" /> Strategy Comparison (Infected Users)
        </h3>
        
        <div className="space-y-4">
          {/* Baseline */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">No Intervention (Baseline)</span>
              <span className="text-white font-medium">{baselineCount}</span>
            </div>
            <div className="h-6 bg-background rounded-md overflow-hidden border border-white/5 flex">
              <div className="h-full bg-gray-600 transition-all duration-500" style={{ width: `${(baselineCount / users.length) * 100}%` }} />
            </div>
          </div>

          {/* Random */}
          {randomResult && (
             <div>
             <div className="flex justify-between text-sm mb-1">
               <span className="text-gray-400">Random Selection</span>
               <span className="text-white font-medium">{randomResult.infectedCount}</span>
             </div>
             <div className="h-6 bg-background rounded-md overflow-hidden border border-white/5 flex">
               <div className="h-full bg-gray-500 transition-all duration-500" style={{ width: `${(randomResult.infectedCount / users.length) * 100}%` }} />
             </div>
           </div>
          )}

          {/* Degree */}
          {degreeResult && (
             <div>
             <div className="flex justify-between text-sm mb-1">
               <span className="text-shieldBlue">Degree Centrality</span>
               <span className="text-shieldBlue font-medium">{degreeResult.infectedCount}</span>
             </div>
             <div className="h-6 bg-background rounded-md overflow-hidden border border-white/5 flex">
               <div className="h-full bg-shieldBlue transition-all duration-500" style={{ width: `${(degreeResult.infectedCount / users.length) * 100}%` }} />
             </div>
           </div>
          )}

          {/* Greedy */}
          {greedyResult && (
             <div>
             <div className="flex justify-between text-sm mb-1">
               <span className="text-shieldRed">Greedy Algorithm</span>
               <span className="text-shieldRed font-medium">{greedyResult.infectedCount}</span>
             </div>
             <div className="h-6 bg-background rounded-md overflow-hidden border border-white/5 flex">
               <div className="h-full bg-shieldRed transition-all duration-500" style={{ width: `${(greedyResult.infectedCount / users.length) * 100}%` }} />
             </div>
           </div>
          )}
        </div>
      </div>
    </div>
  );
}
