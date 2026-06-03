import { useAppContext } from '../context/AppContext';
import { Users, Link as LinkIcon, Component, Bug, Play, Activity, ShieldAlert, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { users, edges, history } = useAppContext();

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
