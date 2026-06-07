import React, { createContext, useContext, useState, useEffect } from 'react';

export type User = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  community: number;
  followers: number;
  following: string[];
  isInfected: boolean;
  isProtected: boolean;
};

export type Edge = { source: string; target: string; };

export type Post = {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  shares: number;
  infected: boolean;
  explanation?: string;
  flaggedBy: string[];    // user IDs who flagged
  likedBy: string[];      // user IDs who liked
  sharedBy: string[];     // user IDs who shared — drives visibility
  sharedTo: string[];     // user IDs who explicitly received the share
  groqChecked: boolean;   // true once Groq has analyzed
};

export type HistoryRun = {
  id: string;
  timestamp: Date;
  strategy: string;
  infectedCount: number;
  reduction: string;
};

/** Summary stored after Groq confirms misinformation — rendered on Dashboard */
export type ContainmentResult = {
  postId: string;
  claim: string;
  authorName: string;
  explanation: string;
  leftTotal: number;    // infected without algorithm
  rightTotal: number;   // infected with algorithm
  savedPct: number;     // % nodes saved
  budgetK: number;
  timestamp: Date;
  sharerIds: string[];  // users who had already shared before detection
};

type AppContextType = {
  users: User[];
  edges: Edge[];
  posts: Post[];
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Visibility: returns posts the given user can see (follower-based)
  getVisiblePosts: (userId: string) => Post[];

  sharePost: (postId: string, targetUserIds: string[]) => void;
  flagPost: (postId: string) => { shouldRunGroq: boolean };
  likePost: (postId: string) => void;
  blockUser: (blockedId: string) => void;
  unblockUser: (blockedId: string) => void;
  blockedByCurrentUser: string[];

  // Misinformation warnings per user (userId → postIds they spread)
  misinfoWarnings: Record<string, string[]>;
  dismissWarning: (postId: string) => void;

  // Containment comparison result (latest confirmed misinformation)
  containmentResults: ContainmentResult[];
  saveContainmentResult: (r: Omit<ContainmentResult, 'timestamp'>) => void;

  theme: 'dark' | 'light';
  toggleTheme: () => void;
  notification: string | null;
  notify: (msg: string) => void;
  history: HistoryRun[];
  addHistory: (run: Omit<HistoryRun, 'id' | 'timestamp'>) => void;
  detectCommunities: () => void;
  addPost: (content: string, authorId: string, infected: boolean, explanation?: string) => string;
  markPostGroqChecked: (postId: string, infected: boolean, explanation: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Network generator ──────────────────────────────────────────────────────
function generateNetworkData() {
  const users: User[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < 100; i++) {
    users.push({
      id: `u${i}`,
      name: `User ${i}`,
      username: `user${i}`,
      avatar: i < 10 ? `U${i}` : `${i}`,
      community: i,
      followers: 0,
      following: [],
      isInfected: false,
      isProtected: false,
    });
  }

  for (let i = 0; i < 300; i++) {
    const si = Math.floor(Math.random() * 100);
    let ti = Math.floor(Math.random() * 100);
    if (Math.random() < 0.8) ti = (si + Math.floor(Math.random() * 15) - 7 + 100) % 100;
    if (si === ti) { i--; continue; }
    const sid = `u${si}`, tid = `u${ti}`;
    if (!users[si].following.includes(tid)) {
      users[si].following.push(tid);
      users[ti].followers += 1;
      edges.push({ source: sid, target: tid });
    } else { i--; }
  }

  return { users, edges };
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const BLOCK_KEY = 'ts_blocks';
const WARN_KEY  = 'ts_warnings';
const CR_KEY    = 'ts_containment';

function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function saveJSON(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers]           = useState<User[]>([]);
  const [edges, setEdges]           = useState<Edge[]>([]);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [blocks, setBlocks]         = useState<Record<string, string[]>>(loadJSON(BLOCK_KEY, {}));
  // misinfoWarnings[userId] = list of post IDs they shared that became infected
  const [misinfoWarnings, setMisinfoWarnings] = useState<Record<string, string[]>>(loadJSON(WARN_KEY, {}));
  const [containmentResults, setContainmentResults] = useState<ContainmentResult[]>(
    loadJSON<ContainmentResult[]>(CR_KEY, []).map(r => ({ ...r, timestamp: new Date(r.timestamp) }))
  );

  const [theme, setTheme]           = useState<'dark' | 'light'>('dark');
  const [notification, setNotification] = useState<string | null>(null);
  const [history, setHistory]       = useState<HistoryRun[]>([]);

  useEffect(() => {
    const { users: u, edges: e } = generateNetworkData();
    setUsers(u);
    setEdges(e);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const addHistory = (run: Omit<HistoryRun, 'id' | 'timestamp'>) => {
    setHistory(prev => [{ ...run, id: Math.random().toString(), timestamp: new Date() }, ...prev]);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = (username: string, password: string): boolean => {
    if (username.trim() !== password.trim()) return false;
    const found = users.find(u => u.username === username.trim());
    if (!found) return false;
    setCurrentUser(found);
    notify(`✅ Logged in as ${found.name}`);
    return true;
  };

  const logout = () => { setCurrentUser(null); notify('👋 Logged out'); };

  // ── Visibility (follower-based feed) ──────────────────────────────────────
  // A user sees a post if:
  //   1. They are the author, OR
  //   2. They themselves have shared it, OR
  //   3. At least one person they follow has shared it
  const getVisiblePosts = (userId: string): Post[] => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    const blockedIds = blocks[userId] || [];
    return posts.filter(p => {
      if (blockedIds.includes(p.authorId)) return false; // blocked author
      if (p.authorId === userId) return true;             // own posts always visible
      if (p.sharedTo.includes(userId)) return true;       // explicitly shared with you
      return false;
    });
  };

  // ── Block ─────────────────────────────────────────────────────────────────
  const blockedByCurrentUser = currentUser ? (blocks[currentUser.id] || []) : [];

  const blockUser = (blockedId: string) => {
    if (!currentUser) return;
    setBlocks(prev => {
      const upd = { ...prev, [currentUser.id]: [...(prev[currentUser.id] || []).filter(x => x !== blockedId), blockedId] };
      saveJSON(BLOCK_KEY, upd);
      return upd;
    });
    notify("🚫 User blocked — their posts won't appear in your feed");
  };

  const unblockUser = (blockedId: string) => {
    if (!currentUser) return;
    setBlocks(prev => {
      const upd = { ...prev, [currentUser.id]: (prev[currentUser.id] || []).filter(x => x !== blockedId) };
      saveJSON(BLOCK_KEY, upd);
      return upd;
    });
    notify('✅ User unblocked');
  };

  // ── Warning dismiss ───────────────────────────────────────────────────────
  const dismissWarning = (postId: string) => {
    if (!currentUser) return;
    setMisinfoWarnings(prev => {
      const upd = { ...prev, [currentUser.id]: (prev[currentUser.id] || []).filter(id => id !== postId) };
      saveJSON(WARN_KEY, upd);
      return upd;
    });
  };

  // ── Containment result storage (for Dashboard) ────────────────────────────
  const saveContainmentResult = (r: Omit<ContainmentResult, 'timestamp'>) => {
    setContainmentResults(prev => {
      const upd = [{ ...r, timestamp: new Date() }, ...prev].slice(0, 10); // keep last 10
      saveJSON(CR_KEY, upd);
      return upd;
    });
  };

  // ── Post actions ──────────────────────────────────────────────────────────
  const sharePost = (postId: string, targetUserIds: string[]) => {
    if (!currentUser) { notify('⚠️ Log in to share posts'); return; }
    if (targetUserIds.length === 0) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      if (p.infected) {
        notify('🚫 Cannot share — this post has been confirmed as misinformation!');
        return p;
      }
      // Add only unique target user IDs that aren't already in sharedTo
      const newTargets = targetUserIds.filter(id => !p.sharedTo.includes(id));
      if (newTargets.length === 0) {
        notify('ℹ️ Already shared with these users');
        return p;
      }
      return { 
        ...p, 
        shares: p.shares + newTargets.length, 
        sharedBy: p.sharedBy.includes(currentUser.id) ? p.sharedBy : [...p.sharedBy, currentUser.id],
        sharedTo: [...p.sharedTo, ...newTargets]
      };
    }));
    notify('🔁 Shared successfully!');
  };

  const likePost = (postId: string) => {
    if (!currentUser) { notify('⚠️ Log in to like posts'); return; }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return p.likedBy.includes(currentUser.id)
        ? { ...p, likedBy: p.likedBy.filter(id => id !== currentUser.id) }
        : { ...p, likedBy: [...p.likedBy, currentUser.id] };
    }));
  };

  const flagPost = (postId: string): { shouldRunGroq: boolean } => {
    if (!currentUser) { notify('⚠️ Log in to flag posts'); return { shouldRunGroq: false }; }
    let shouldRunGroq = false;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      if (p.flaggedBy.includes(currentUser.id)) { notify('ℹ️ You already flagged this post'); return p; }
      if (p.authorId === currentUser.id) { notify('⚠️ You cannot flag your own post'); return p; }
      const newFlaggedBy = [...p.flaggedBy, currentUser.id];
      if (newFlaggedBy.length >= 3 && !p.groqChecked) shouldRunGroq = true;
      return { ...p, flaggedBy: newFlaggedBy };
    }));
    notify(`🚩 Flagged (${shouldRunGroq ? 'sending to Groq AI...' : 'needs more flags to trigger AI'})`);
    return { shouldRunGroq };
  };

  const addPost = (content: string, authorId: string, infected: boolean, explanation?: string): string => {
    const id = `p_${Date.now()}`;
    setPosts(prev => [{
      id, authorId, content,
      timestamp: new Date(),
      shares: 0, infected, explanation,
      flaggedBy: [], likedBy: [], sharedBy: [], sharedTo: [], groqChecked: false,
    }, ...prev]);
    return id;
  };

  /** Called by SocialFeed after Groq returns a verdict */
  const markPostGroqChecked = (postId: string, infected: boolean, explanation: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      // If confirmed misinformation → warn every user who already shared it
      if (infected && p.sharedBy.length > 0) {
        setMisinfoWarnings(w => {
          const upd = { ...w };
          p.sharedBy.forEach(uid => {
            upd[uid] = [...(upd[uid] || []).filter(id => id !== postId), postId];
          });
          saveJSON(WARN_KEY, upd);
          return upd;
        });
      }

      return { ...p, groqChecked: true, infected, explanation };
    }));
  };

  // ── Community detection ───────────────────────────────────────────────────
  const detectCommunities = () => {
    const adj = new Map<string, string[]>();
    users.forEach(u => adj.set(u.id, []));
    edges.forEach(e => { adj.get(e.source)!.push(e.target); adj.get(e.target)!.push(e.source); });

    let cur = [...users];
    let changed = true, iters = 0;
    while (changed && iters < 10) {
      changed = false; iters++;
      cur = cur.map(u => {
        const neighbors = adj.get(u.id) || [];
        if (!neighbors.length) return u;
        const counts: Record<number, number> = {};
        neighbors.forEach(nId => {
          const c = cur.find(x => x.id === nId)?.community;
          if (c !== undefined) counts[c] = (counts[c] || 0) + 1;
        });
        let best = u.community, max = 0;
        for (const [c, cnt] of Object.entries(counts)) {
          if (cnt > max) { max = cnt; best = +c; }
        }
        if (best !== u.community) { changed = true; return { ...u, community: best }; }
        return u;
      });
    }

    const comms = Array.from(new Set(cur.map(u => u.community))).slice(0, 5);
    cur = cur.map(u => ({ ...u, community: (comms.indexOf(u.community) + 1) || 1 }));
    setUsers(cur);
    notify('🔍 Community detection complete');
  };

  return (
    <AppContext.Provider value={{
      users, edges, posts,
      currentUser, login, logout,
      getVisiblePosts,
      sharePost, flagPost, likePost,
      blockUser, unblockUser, blockedByCurrentUser,
      misinfoWarnings, dismissWarning,
      containmentResults, saveContainmentResult,
      theme, toggleTheme, notification, notify,
      history, addHistory,
      detectCommunities, addPost, markPostGroqChecked,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
