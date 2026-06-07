import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/useAppContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList,
  LineChart, Line, PieChart, Pie
} from 'recharts';
import { Download, RefreshCw, BarChart2, TrendingDown, Target, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

// Constants
const communityColors: Record<number, string> = {
  1: '#E8453C', 2: '#4A90D9', 3: '#2ECC71', 4: '#F5A623', 5: '#9B59B6',
};

const STRATEGY_COLORS = {
  Baseline: '#E8453C', // Red
  Random: '#F5A623',   // Orange
  Degree: '#4A90D9',   // Blue
  Greedy: '#2ECC71'    // Green
};

type SimResult = {
  count: number;
  wave: { step: number, count: number }[];
  infectedSet: Set<string>;
  protectedSet: Set<string>;
};

export default function Analytics() {
  const { users, edges } = useAppContext();
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [totalRuns, setTotalRuns] = useState(0);
  
  // Results
  const [baselineRes, setBaselineRes] = useState<SimResult | null>(null);
  const [randomRes, setRandomRes] = useState<SimResult | null>(null);
  const [degreeRes, setDegreeRes] = useState<SimResult | null>(null);
  const [greedyRes, setGreedyRes] = useState<SimResult | null>(null);

  const budgetK = 5;
  const spreadProb = 0.3;

  // Run all strategies
  const runSimulations = () => {
    setIsSimulating(true);

    setTimeout(() => {
      const sourceNode = users[0]?.id || '';
      
      // Deterministic edges
      const adj = new Map<string, string[]>();
      users.forEach(u => adj.set(u.id, []));
      edges.forEach(e => {
        if (Math.random() < spreadProb) adj.get(e.source)!.push(e.target);
      });

      const simulate = (protectedSet: Set<string>): SimResult => {
        if (protectedSet.has(sourceNode)) return { count: 0, wave: [{ step: 0, count: 0 }], infectedSet: new Set(), protectedSet };
        const infected = new Set<string>([sourceNode]);
        let currentWave = [sourceNode];
        let step = 0;
        const wave = [{ step: 0, count: 1 }];
        
        while (currentWave.length > 0) {
          const nextWave: string[] = [];
          for (const node of currentWave) {
            for (const neighbor of (adj.get(node) || [])) {
              if (!infected.has(neighbor) && !protectedSet.has(neighbor)) {
                infected.add(neighbor);
                nextWave.push(neighbor);
              }
            }
          }
          currentWave = nextWave;
          if (nextWave.length > 0) {
            step++;
            wave.push({ step, count: infected.size });
          }
        }
        return { count: infected.size, wave, infectedSet: infected, protectedSet };
      };

      // 1. Baseline
      const bRes = simulate(new Set());
      setBaselineRes(bRes);

      // 2. Random
      const randomIds = [...users].sort(() => 0.5 - Math.random()).slice(0, budgetK).map(u => u.id);
      setRandomRes(simulate(new Set(randomIds)));

      // 3. Degree Centrality
      const inDegrees = new Map<string, number>();
      users.forEach(u => inDegrees.set(u.id, 0));
      edges.forEach(e => inDegrees.set(e.target, inDegrees.get(e.target)! + 1));
      const sortedByDegree = [...users].sort((a, b) => inDegrees.get(b.id)! - inDegrees.get(a.id)!);
      const degreeIds = sortedByDegree.slice(0, budgetK).map(u => u.id);
      setDegreeRes(simulate(new Set(degreeIds)));

      // 4. Greedy
      const greedySet = new Set<string>();
      for (let i = 0; i < budgetK; i++) {
        let best = '';
        let minC = Infinity;
        for (const u of users) {
          if (!greedySet.has(u.id)) {
            greedySet.add(u.id);
            const c = simulate(greedySet).count;
            if (c < minC) { minC = c; best = u.id; }
            greedySet.delete(u.id);
          }
        }
        if (best) greedySet.add(best);
      }
      setGreedyRes(simulate(greedySet));
      
      setTotalRuns(prev => prev + 1);
      setIsSimulating(false);
    }, 100);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSimulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, edges]); // Run once data is loaded

  // Derived Data for Charts
  const barData = useMemo(() => {
    if (!baselineRes || !randomRes || !degreeRes || !greedyRes) return [];
    return [
      { name: 'Baseline', count: baselineRes.count, fill: STRATEGY_COLORS.Baseline },
      { name: 'Random', count: randomRes.count, fill: STRATEGY_COLORS.Random },
      { name: 'Degree', count: degreeRes.count, fill: STRATEGY_COLORS.Degree },
      { name: 'Greedy', count: greedyRes.count, fill: STRATEGY_COLORS.Greedy }
    ];
  }, [baselineRes, randomRes, degreeRes, greedyRes]);

  const lineData = useMemo(() => {
    if (!baselineRes || !randomRes || !degreeRes || !greedyRes) return [];
    const maxSteps = Math.max(
      baselineRes.wave.length, randomRes.wave.length, 
      degreeRes.wave.length, greedyRes.wave.length
    );
    
    const data = [];
    for (let i = 0; i < maxSteps; i++) {
      data.push({
        step: i,
        Baseline: baselineRes.wave[i]?.count ?? baselineRes.count,
        Random: randomRes.wave[i]?.count ?? randomRes.count,
        Degree: degreeRes.wave[i]?.count ?? degreeRes.count,
        Greedy: greedyRes.wave[i]?.count ?? greedyRes.count,
      });
    }
    return data;
  }, [baselineRes, randomRes, degreeRes, greedyRes]);

  const pieData = useMemo(() => {
    if (!baselineRes) return [];
    const commCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    baselineRes.infectedSet.forEach(id => {
      const u = users.find(x => x.id === id);
      if (u) commCounts[u.community]++;
    });
    return Object.entries(commCounts).map(([comm, count]) => ({
      name: `Community ${comm}`,
      value: count,
      fill: communityColors[parseInt(comm)]
    })).filter(x => x.value > 0);
  }, [baselineRes, users]);

  const influencerData = useMemo(() => {
    const inDegrees = new Map<string, number>();
    users.forEach(u => inDegrees.set(u.id, 0));
    edges.forEach(e => inDegrees.set(e.target, inDegrees.get(e.target)! + 1));
    
    return [...users].sort((a, b) => inDegrees.get(b.id)! - inDegrees.get(a.id)!)
      .slice(0, 10)
      .map(u => ({
        name: u.username,
        degree: inDegrees.get(u.id)!,
        // Check if greedy protected this node
        protected: greedyRes?.protectedSet.has(u.id) || false
      }));
  }, [users, edges, greedyRes]);

  // Summaries
  const maxReduction = greedyRes && baselineRes && baselineRes.count > 0 
    ? ((baselineRes.count - greedyRes.count) / baselineRes.count) * 100 
    : 0;

  const exportJSON = () => {
    const data = { barData, lineData, pieData, influencerData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'truthshield-analytics.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chartTheme = {
    textColor: '#8b949e',
    gridColor: 'rgba(255,255,255,0.05)',
    tooltipBg: '#161B22',
    tooltipBorder: 'rgba(255,255,255,0.1)'
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6 p-2 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">Comprehensive breakdown of simulation data and intervention metrics.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-background hover:bg-white/5 border border-white/10 text-gray-300 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export Results
          </button>
          <button 
            onClick={runSimulations}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 bg-shieldBlue hover:bg-shieldBlue/90 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isSimulating && "animate-spin")} /> Re-run All Strategies
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-white/5 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-lg text-gray-300"><BarChart2 className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-400">Total Simulations</p><p className="text-xl font-bold text-white">{totalRuns}</p></div>
        </div>
        <div className="bg-surface border border-white/5 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-shieldGreen/20 text-shieldGreen rounded-lg"><Target className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-400">Best Strategy</p><p className="text-xl font-bold text-white">Greedy</p></div>
        </div>
        <div className="bg-surface border border-white/5 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-shieldBlue/20 text-shieldBlue rounded-lg"><TrendingDown className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-400">Max Reduction</p><p className="text-xl font-bold text-white">{maxReduction.toFixed(1)}%</p></div>
        </div>
        <div className="bg-surface border border-white/5 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-shieldRed/20 text-shieldRed rounded-lg"><Activity className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-400">Avg Infection Rate</p><p className="text-xl font-bold text-white">
            {baselineRes ? ((baselineRes.count / users.length) * 100).toFixed(1) : 0}%
          </p></div>
        </div>
      </div>

      {/* 2x2 Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        
        {/* Chart 1: Strategy Comparison Bar Chart */}
        <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm h-80 flex flex-col">
          <h3 className="text-sm font-medium text-gray-300 mb-4 text-center">Strategy Comparison Results</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartTheme.textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, users.length]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="count" position="top" fill="#fff" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Infection Wave Line Chart */}
        <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm h-80 flex flex-col">
          <h3 className="text-sm font-medium text-gray-300 mb-4 text-center">Infection Wave Over Time</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                <XAxis dataKey="step" tick={{ fill: chartTheme.textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTheme.textColor, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 'dataMax']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: '#fff', borderRadius: '8px' }}
                  labelStyle={{ color: chartTheme.textColor }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: chartTheme.textColor }} />
                <Line type="monotone" dataKey="Baseline" stroke={STRATEGY_COLORS.Baseline} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Random" stroke={STRATEGY_COLORS.Random} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Degree" stroke={STRATEGY_COLORS.Degree} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Greedy" stroke={STRATEGY_COLORS.Greedy} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Community Risk Pie Chart */}
        <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm h-80 flex flex-col">
          <h3 className="text-sm font-medium text-gray-300 mb-0 text-center">Community Risk (Baseline)</h3>
          <div className="flex-1 -mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(22, 27, 34, 0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: '#fff', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Top 10 Influencers Bar Chart */}
        <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm h-80 flex flex-col">
          <h3 className="text-sm font-medium text-gray-300 mb-4 text-center">Top 10 Influencers (Degree Score)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={influencerData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fill: chartTheme.textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: chartTheme.textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder, color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="degree" radius={[0, 4, 4, 0]} barSize={16}>
                  {influencerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.protected ? STRATEGY_COLORS.Greedy : '#30363D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-shieldGreen rounded-sm"></div> Protected by Greedy</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#30363D] rounded-sm"></div> Unprotected</div>
          </div>
        </div>

      </div>
    </div>
  );
}
