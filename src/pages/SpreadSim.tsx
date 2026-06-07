import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/useAppContext';
import { Play, SkipForward, RotateCcw, Activity, Users, Bug, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import CytoscapeComponent from 'react-cytoscapejs';

type WaveData = {
  step: number;
  newInfections: string[];
};

type SimulationResult = {
  infected: Set<string>;
  timeSteps: number;
  waveData: WaveData[];
};

export default function SpreadSim() {
  const { users, edges, addHistory, notify } = useAppContext();
  const [sourceNode, setSourceNode] = useState<string>(users[0]?.id || '');
  const [spreadProb, setSpreadProb] = useState<number>(0.3);
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !simResult) return;
    
    if (currentStep >= simResult.timeSteps) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 800); // 800ms per step

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, simResult]);

  const runSimulation = (manualStep: boolean = false) => {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });

    const infected = new Set<string>([sourceNode]);
    const waveData: WaveData[] = [{ step: 0, newInfections: [sourceNode] }];
    let currentWave = [sourceNode];
    let step = 0;

    while (currentWave.length > 0) {
      const nextWave: string[] = [];
      for (const node of currentWave) {
        const neighbors = adj.get(node) || [];
        for (const neighbor of neighbors) {
          if (!infected.has(neighbor)) {
            // Can check if neighbor is isProtected here (could add feature later)
            const targetUser = users.find(u => u.id === neighbor);
            if (targetUser && !targetUser.isProtected && Math.random() < spreadProb) {
              infected.add(neighbor);
              nextWave.push(neighbor);
            }
          }
        }
      }
      
      if (nextWave.length > 0) {
        step++;
        waveData.push({ step, newInfections: nextWave });
      }
      currentWave = nextWave;
    }

    setSimResult({ infected, timeSteps: step, waveData });
    setCurrentStep(0);
    if (!manualStep) {
      if (step > 0) {
        addHistory({ strategy: 'BFS Spread Sim', infectedCount: infected.size, reduction: '' });
        notify(`✅ Simulation Complete — ${infected.size} users infected`);
      }
    }
  };

  const handleReset = () => {
    setSimResult(null);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // Compute stats for current step
  const currentInfectedCount = useMemo(() => {
    if (!simResult) return 0;
    let count = 0;
    for (let i = 0; i <= currentStep; i++) {
      if (simResult.waveData[i]) {
        count += simResult.waveData[i].newInfections.length;
      }
    }
    return count;
  }, [simResult, currentStep]);

  const currentInfectedSet = useMemo(() => {
    const set = new Set<string>();
    if (!simResult) return set;
    for (let i = 0; i <= currentStep; i++) {
      if (simResult.waveData[i]) {
        simResult.waveData[i].newInfections.forEach(id => set.add(id));
      }
    }
    return set;
  }, [simResult, currentStep]);

  // Minimap Elements
  const miniMapElements = useMemo(() => {
    const cyNodes = users.map(user => ({
      data: {
        id: user.id,
        isInfected: currentInfectedSet.has(user.id),
      }
    }));
    const cyEdges = edges.map((e, i) => ({
      data: { id: `e${i}`, source: e.source, target: e.target }
    }));
    return [...cyNodes, ...cyEdges];
  }, [users, edges, currentInfectedSet]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 h-full p-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Spread Simulation</h2>
          <p className="text-sm text-gray-400 mt-1">Simulate misinformation propagation using BFS traversal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Controls & Stats */}
        <div className="flex flex-col gap-6">
          {/* Controls Panel */}
          <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-shieldBlue" /> Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Source User (Patient Zero)</label>
                <select 
                  value={sourceNode}
                  onChange={(e) => setSourceNode(e.target.value)}
                  disabled={isPlaying || simResult !== null}
                  className="w-full bg-background border border-white/10 rounded-md text-sm text-white px-3 py-2 outline-none focus:border-shieldBlue disabled:opacity-50"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 flex justify-between">
                  <span>Spread Probability</span>
                  <span className="text-white font-medium">{(spreadProb * 100).toFixed(0)}%</span>
                </label>
                <input 
                  type="range" 
                  min="0.0" max="1.0" step="0.1" 
                  value={spreadProb}
                  onChange={(e) => setSpreadProb(parseFloat(e.target.value))}
                  disabled={isPlaying || simResult !== null}
                  className="w-full accent-shieldBlue disabled:opacity-50"
                />
              </div>

              <div className="pt-2 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => !simResult ? runSimulation(false) : setIsPlaying(!isPlaying)}
                  className="col-span-1 bg-shieldBlue hover:bg-shieldBlue/90 text-white rounded-md py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> {isPlaying ? 'Pause' : (simResult ? 'Resume' : 'Run')}
                </button>
                <button 
                  onClick={() => {
                    if (!simResult) runSimulation(true);
                    else if (currentStep < simResult.timeSteps) setCurrentStep(prev => prev + 1);
                  }}
                  disabled={isPlaying || (simResult !== null && currentStep >= simResult.timeSteps)}
                  className="col-span-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" /> Step
                </button>
                <button 
                  onClick={handleReset}
                  className="col-span-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-md py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Live Stats */}
          <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm flex-1">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Bug className="w-5 h-5 text-shieldRed" /> Live Statistics
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Total Infected</span>
                  <span className="text-white font-medium">{currentInfectedCount} / {users.length}</span>
                </div>
                <div className="h-3 bg-background rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-shieldRed transition-all duration-500 ease-out"
                    style={{ width: `${(currentInfectedCount / users.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-lg p-3 border border-white/5 text-center">
                  <p className="text-xs text-gray-500 mb-1">Time Step</p>
                  <p className="text-2xl font-bold text-white">{currentStep}</p>
                </div>
                <div className="bg-background rounded-lg p-3 border border-white/5 text-center">
                  <p className="text-xs text-gray-500 mb-1">Infection Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {((currentInfectedCount / users.length) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {simResult && currentStep === simResult.timeSteps && (
                <div className="mt-4 bg-shieldGreen/10 border border-shieldGreen/20 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-shieldGreen shrink-0" />
                  <p className="text-sm text-shieldGreen">
                    Simulation complete: <strong>{currentInfectedCount}</strong> users infected in <strong>{simResult.timeSteps}</strong> steps.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Minimap & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
          
          {/* Minimap */}
          <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-[300px]">
             <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" /> Network Minimap
            </h3>
            <div className="flex-1 bg-background rounded-lg border border-white/5 overflow-hidden relative">
              <CytoscapeComponent
                elements={miniMapElements}
                style={{ width: '100%', height: '100%' }}
                layout={{ name: 'cose', animate: false, randomize: false }}
                stylesheet={[
                  {
                    selector: 'node',
                    style: {
                      'width': 12, 'height': 12,
                      'background-color': '#4A90D9',
                      'border-width': 1, 'border-color': '#161B22',
                      'transition-property': 'background-color, width, height',
                      'transition-duration': 300
                    }
                  },
                  {
                    selector: 'node[?isInfected]',
                    style: {
                      'background-color': '#E8453C',
                      'width': 16, 'height': 16,
                      'border-width': 2, 'border-color': '#FF3333'
                    }
                  },
                  {
                    selector: 'edge',
                    style: {
                      'width': 1,
                      'line-color': '#30363D',
                      'opacity': 0.5
                    }
                  }
                ]}
                pan={{x:0, y:0}}
                zoom={1}
                autoungrabify={true}
                userZoomingEnabled={false}
                userPanningEnabled={true}
              />
            </div>
          </div>

          {/* Timeline Bar */}
          <div className="bg-surface border border-white/5 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Infection Timeline</h3>
            <div className="flex gap-1 h-12">
              {!simResult && (
                <div className="flex-1 border border-dashed border-white/10 rounded flex items-center justify-center text-xs text-gray-500">
                  Run simulation to view timeline
                </div>
              )}
              {simResult && simResult.waveData.map((wave) => {
                const heightPercent = Math.max(10, (wave.newInfections.length / users.length) * 100);
                const isActive = wave.step <= currentStep;
                return (
                  <div 
                    key={wave.step} 
                    className="flex-1 flex flex-col justify-end group relative"
                    title={`Step ${wave.step}: ${wave.newInfections.length} new infections`}
                  >
                    <div 
                      className={cn(
                        "w-full rounded-sm transition-all duration-300",
                        isActive ? "bg-shieldRed" : "bg-white/10"
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      S{wave.step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
