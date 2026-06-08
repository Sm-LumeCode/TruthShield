import { useState, useMemo, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { type User, type Post } from '../context/AppContext';
import { useAppContext } from '../context/useAppContext';
import { ZoomIn, ZoomOut, Maximize, Settings2, ShieldCheck, Bug, Network, MessageSquare, ChevronDown, ChevronRight, User as UserIcon, Send } from 'lucide-react';
import { cn } from '../lib/utils';

const communityColors = {
  1: '#E8453C', 
  2: '#4A90D9', 
  3: '#2ECC71', 
  4: '#F5A623', 
  5: '#9B59B6', 
};

export default function NetworkGraph() {
  const { users, edges, currentUser, posts } = useAppContext();
  const [layoutName, setLayoutName] = useState<'cose' | 'grid'>('cose');
  const [showLabels, setShowLabels] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [criticalUsers, setCriticalUsers] = useState<{id: string, name: string, degree: number}[] | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Convert context data to Cytoscape elements (Filtered)
  const elements = useMemo(() => {
    let filteredUsers = users;
    let filteredEdges = edges;

    if (currentUser) {
      filteredEdges = edges.filter(e => e.source === currentUser.id || e.target === currentUser.id);
      const involvedIds = new Set<string>();
      filteredEdges.forEach(e => { involvedIds.add(e.source); involvedIds.add(e.target); });
      involvedIds.add(currentUser.id);
      filteredUsers = users.filter(u => involvedIds.has(u.id));
    }

    const cyNodes = filteredUsers.map(user => {
      const size = 15 + Math.min(user.followers * 2, 40); 
      
      return {
        data: { 
          id: user.id, 
          label: user.username,
          community: user.community,
          followers: user.followers,
          size,
          color: user.id === currentUser?.id ? '#4A90D9' : (communityColors[user.community as keyof typeof communityColors] || '#ccc'),
          isInfected: user.isInfected,
          isProtected: user.isProtected,
          rawUser: user
        }
      };
    });

    const cyEdges = filteredEdges.map((edge, i) => ({
      data: {
        id: `e${i}`,
        source: edge.source,
        target: edge.target
      }
    }));

    return [...cyNodes, ...cyEdges];
  }, [users, edges, currentUser]);

  // Cy stylesheet
  const stylesheet = useMemo<cytoscape.StylesheetStyle[]>(() => [
    {
      selector: 'node',
      style: {
        'width': 'data(size)',
        'height': 'data(size)',
        'background-color': 'data(color)',
        'label': showLabels ? 'data(label)' : '',
        'color': '#fff',
        'font-size': '10px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'border-width': 2,
        'border-color': '#161B22',
        'transition-property': 'background-color, border-color, border-width, width, height',
        'transition-duration': 300
      }
    },
    {
      selector: 'node[?isInfected]',
      style: {
        'background-color': '#FF3333',
        'border-color': '#FF0000',
        'border-width': 4,
        'underlay-color': '#FF0000',
        'underlay-padding': 6,
        'underlay-opacity': 0.6,
      }
    },
    {
      selector: 'node[?isProtected]',
      style: {
        'border-color': '#2ECC71',
        'border-width': 4,
        'border-style': 'double'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#30363D',
        'target-arrow-color': '#30363D',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.6,
        'transition-property': 'line-color, target-arrow-color, width',
        'transition-duration': 200
      }
    },
    {
      selector: 'node.hover-highlight',
      style: {
        'border-width': 4,
        'border-color': '#F5A623'
      }
    },
    {
      selector: 'edge.hover-highlight',
      style: {
        'line-color': '#F5A623',
        'target-arrow-color': '#F5A623',
        'width': 3,
        'opacity': 1,
        'z-index': 10
      }
    },
    {
      selector: 'node.faded',
      style: {
        'opacity': 0.2
      }
    },
    {
      selector: 'edge.faded',
      style: {
        'opacity': 0.1
      }
    }
  ], [showLabels]);

  const handleZoom = (direction: 'in' | 'out' | 'fit') => {
    if (!cyRef.current) return;
    if (direction === 'fit') {
      cyRef.current.fit(undefined, 50);
    } else {
      const zoom = cyRef.current.zoom();
      cyRef.current.zoom({
        level: direction === 'in' ? zoom * 1.5 : zoom / 1.5,
        renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 }
      });
    }
  };

  const onCyInit = useCallback((cy: cytoscape.Core) => {
    cyRef.current = cy;
    
    // Interactions
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedUser(node.data('rawUser'));
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedUser(null);
      }
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      cy.elements().removeClass('hover-highlight faded');
      cy.elements().difference(node.neighborhood().union(node)).addClass('faded');
      node.addClass('hover-highlight');
      node.connectedEdges().addClass('hover-highlight');
    });

    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('hover-highlight faded');
    });

  }, []);

  const runCriticality = () => {
    const outDegrees = new Map<string, number>();
    users.forEach(u => outDegrees.set(u.id, 0));
    edges.forEach(e => outDegrees.set(e.source, outDegrees.get(e.source)! + 1));

    const ranked = users.map(u => ({
      id: u.id,
      name: u.username,
      degree: outDegrees.get(u.id)! + (u.followers * 0.5)
    })).sort((a, b) => b.degree - a.degree);

    setCriticalUsers(ranked.slice(0, 5));
  };

  // Get user's posts for User Analysis
  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(p => p.authorId === currentUser.id || p.sharedBy.includes(currentUser.id) || p.sharedTo.includes(currentUser.id));
  }, [posts, currentUser]);

  const getPostReceivers = (post: Post) => {
    if (!currentUser) return [];
    return users.filter(u => 
      edges.some(e => e.source === currentUser.id && e.target === u.id) &&
      post.sharedTo.includes(u.id)
    );
  };

  const getPostSenders = (post: Post) => {
    if (!currentUser) return [];
    return users.filter(u => 
      edges.some(e => e.source === u.id && e.target === currentUser.id) &&
      (post.sharedBy.includes(u.id) || post.authorId === u.id)
    );
  };

  return (
    <div className="h-full flex flex-col -m-4 md:-m-6 relative">
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h2 className="text-2xl font-semibold text-white tracking-tight drop-shadow-md">Network Graph</h2>
        <p className="text-sm text-gray-300 mt-1 drop-shadow-md">Visualizing {elements.length} components.</p>
      </div>

      <div className="flex-1 bg-background relative overflow-hidden">
        <CytoscapeComponent
          elements={elements}
          stylesheet={stylesheet}
          style={{ width: '100%', height: '100%' }}
          layout={{ name: layoutName, animate: true }}
          cy={(cy) => onCyInit(cy)}
          minZoom={0.2}
          maxZoom={3}
        />
      </div>

      {/* Right Controls Panel */}
      <div className="absolute top-6 right-6 w-64 bg-surface/90 backdrop-blur-md border border-borderColor rounded-xl p-4 shadow-xl z-10 flex flex-col gap-4">
        <div className="flex items-center gap-2 font-medium mb-1">
          <Settings2 className="w-4 h-4" /> Controls
        </div>
        
        <button onClick={runCriticality} className="w-full py-2 bg-shieldRed hover:bg-shieldRed/90 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
          <Network className="w-4 h-4" /> Run Criticality
        </button>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Layout Algorithm</label>
          <select 
            value={layoutName} 
            onChange={(e) => setLayoutName(e.target.value as 'cose' | 'grid')}
            className="w-full bg-background border border-white/10 rounded-md text-sm text-white px-3 py-2 outline-none focus:border-shieldBlue"
          >
            <option value="cose">Force-directed (CoSE)</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Show Node Labels</span>
          <button 
            onClick={() => setShowLabels(!showLabels)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              showLabels ? "bg-shieldBlue" : "bg-gray-600"
            )}
          >
            <span className={cn(
              "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
              showLabels ? "translate-x-4" : "translate-x-1"
            )} />
          </button>
        </div>

        <div className="border-t border-white/10 pt-4 flex gap-2 justify-center">
          <button onClick={() => handleZoom('out')} className="p-2 bg-background hover:bg-white/5 border border-white/10 rounded-md text-gray-300 hover:text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom('fit')} className="p-2 bg-background hover:bg-white/5 border border-white/10 rounded-md text-gray-300 hover:text-white transition-colors" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom('in')} className="p-2 bg-background hover:bg-white/5 border border-white/10 rounded-md text-gray-300 hover:text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {criticalUsers && (
          <div className="mt-2 border-t border-white/10 pt-4">
            <h4 className="text-xs text-gray-400 uppercase font-bold mb-2">Most Critical Users</h4>
            <div className="space-y-2">
              {criticalUsers.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between bg-background rounded p-2 text-sm border border-shieldRed/20">
                  <span className="font-semibold text-gray-200">#{i+1} {u.name}</span>
                  <span className="text-shieldRed text-xs font-bold">{u.degree}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Node Details Popup (if selected) */}
      {selectedUser && (
        <div className="absolute bottom-6 right-6 w-64 bg-surface border border-white/10 rounded-xl p-4 shadow-2xl z-10 animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner"
                style={{ backgroundColor: communityColors[selectedUser.community as keyof typeof communityColors] }}
              >
                {selectedUser.avatar}
              </div>
              <div>
                <h4 className="text-white font-semibold leading-tight">{selectedUser.name}</h4>
                <p className="text-xs text-gray-400">{selectedUser.username}</p>
              </div>
            </div>
            <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-background rounded px-3 py-2 border border-white/5">
              <p className="text-xs text-gray-500">Community</p>
              <p className="font-medium text-gray-200">{selectedUser.community}</p>
            </div>
            <div className="bg-background rounded px-3 py-2 border border-white/5">
              <p className="text-xs text-gray-500">Followers</p>
              <p className="font-medium text-gray-200">{selectedUser.followers}</p>
            </div>
          </div>
          
          {(selectedUser.isInfected || selectedUser.isProtected) && (
            <div className="mt-3 flex gap-2">
              {selectedUser.isInfected && (
                <div className="flex-1 bg-shieldRed/10 border border-shieldRed/30 text-shieldRed rounded py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5">
                  <Bug className="w-3.5 h-3.5" /> Infected
                </div>
              )}
              {selectedUser.isProtected && (
                <div className="flex-1 bg-shieldGreen/10 border border-shieldGreen/30 text-shieldGreen rounded py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Protected
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* User Analysis Panel */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-4 z-10 w-80">
        <div className="bg-surface/90 backdrop-blur-md border border-borderColor rounded-xl p-4 shadow-xl text-sm">
          <h4 className="font-semibold mb-3 border-b border-borderColor pb-2 flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> User Analysis
          </h4>
          {!currentUser ? (
            <div className="text-textSecondary text-xs py-4 text-center">Log in to see user analysis</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {userPosts.length === 0 ? (
                <div className="text-textSecondary text-xs py-2 text-center">No post interactions found.</div>
              ) : userPosts.map(post => {
                const isExpanded = expandedPost === post.id;
                const receivers = getPostReceivers(post);
                const senders = getPostSenders(post);
                return (
                  <div key={post.id} className="bg-background border border-white/5 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                      className="w-full text-left p-3 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs text-gray-300 truncate font-medium flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-shieldBlue" /> 
                          {post.content}
                        </p>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-white/[0.02]">
                        <div className="mb-2">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Send className="w-3 h-3" /> Sent To ({receivers.length})
                          </p>
                          {receivers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {receivers.map(r => (
                                <span key={r.id} className="text-[10px] bg-shieldBlue/20 text-shieldBlue px-1.5 py-0.5 rounded">@{r.username}</span>
                              ))}
                            </div>
                          ) : <span className="text-[10px] text-gray-600 italic">None</span>}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Network className="w-3 h-3" /> Received From ({senders.length})
                          </p>
                          {senders.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {senders.map(s => (
                                <span key={s.id} className="text-[10px] bg-shieldOrange/20 text-shieldOrange px-1.5 py-0.5 rounded">@{s.username}</span>
                              ))}
                            </div>
                          ) : <span className="text-[10px] text-gray-600 italic">None</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-surface/90 backdrop-blur-md border border-borderColor rounded-xl p-3 shadow-xl flex gap-6 text-xs text-textSecondary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF3333] shadow-[0_0_8px_#FF0000]" />
              <span>Infected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-shieldGreen border-double bg-background" />
              <span>Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
