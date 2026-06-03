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
  id: string; authorId: string; content: string;
  timestamp: Date; shares: number; infected: boolean;
};

export type HistoryRun = {
  id: string;
  timestamp: Date;
  strategy: string;
  infectedCount: number;
  reduction: string;
};

type AppContextType = {
  users: User[];
  edges: Edge[];
  posts: Post[];
  sharePost: (postId: string) => void;
  flagPost: (postId: string) => void;
  
  // New State
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  notification: string | null;
  notify: (msg: string) => void;
  history: HistoryRun[];
  addHistory: (run: Omit<HistoryRun, 'id' | 'timestamp'>) => void;
  detectCommunities: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// ... keep fakeHeadlines ...
const fakeHeadlines = [
  "BREAKING: Local water supply compromised by new 5G towers",
  "BREAKING: Secret government plot revealed in leaked documents",
  "BREAKING: Eating onions every day cures all known diseases",
  "BREAKING: The moon landing was a Hollywood production",
  "BREAKING: Solar flare expected to wipe out internet for months",
  "BREAKING: Top scientists admit Earth might actually be flat",
  "BREAKING: New app steals your thoughts while you sleep",
  "BREAKING: Politicians are secretly reptilian shapeshifters",
  "BREAKING: Putting your phone in the microwave charges it instantly",
  "BREAKING: Artificial gravity device invented in garage",
  "BREAKING: Dinosaurs never existed, fossils are planted",
  "BREAKING: Cloud seeding caused the recent extreme weather",
  "BREAKING: Famous billionaire is actually a time traveler",
  "BREAKING: Ancient aliens built the pyramids, new proof found",
  "BREAKING: Video games are being used for mind control",
  "BREAKING: Drinking saltwater prevents aging",
  "BREAKING: A secret society controls all banks globally",
  "BREAKING: New satellite can read your text messages from space",
  "BREAKING: Organic food is a scam created by the packaging industry",
  "BREAKING: The Bermuda Triangle mystery finally solved"
];

function generateFakeData() {
  const users: User[] = [];
  const edges: Edge[] = [];
  
  for (let i = 0; i < 100; i++) {
    const id = `u${i}`;
    users.push({
      id, name: `User ${i}`, username: `@user${i}`, avatar: `U${i}`,
      community: i, // start each node as its own community for later detection
      followers: 0, following: [],
      isInfected: Math.random() < 0.05,
      isProtected: Math.random() < 0.05,
    });
  }

  for (let i = 0; i < 300; i++) {
    const sourceIndex = Math.floor(Math.random() * 100);
    let targetIndex = Math.floor(Math.random() * 100);
    
    // Group them somewhat to make communities form naturally
    if (Math.random() < 0.8) {
       targetIndex = (sourceIndex + Math.floor(Math.random() * 15) - 7 + 100) % 100;
    }

    if (sourceIndex !== targetIndex) {
      const sourceId = `u${sourceIndex}`;
      const targetId = `u${targetIndex}`;
      
      if (!users[sourceIndex].following.includes(targetId)) {
        users[sourceIndex].following.push(targetId);
        users[targetIndex].followers += 1;
        edges.push({ source: sourceId, target: targetId });
      } else { i--; }
    } else { i--; }
  }

  const posts: Post[] = [];
  for (let i = 0; i < 20; i++) {
    posts.push({
      id: `p${i}`, authorId: `u${Math.floor(Math.random() * 100)}`,
      content: fakeHeadlines[i],
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 100000000)),
      shares: Math.floor(Math.random() * 50), infected: false,
    });
  }
  posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return { users, edges, posts };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notification, setNotification] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRun[]>([]);

  useEffect(() => {
    const data = generateFakeData();
    setUsers(data.users);
    setEdges(data.edges);
    setPosts(data.posts);
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const addHistory = (run: Omit<HistoryRun, 'id' | 'timestamp'>) => {
    setHistory(prev => [{ ...run, id: Math.random().toString(), timestamp: new Date() }, ...prev]);
  };

  const sharePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p));
    notify('✅ Post shared successfully');
  };

  const flagPost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, infected: true } : p));
    notify('⚠️ Post flagged as misinformation');
  };

  const detectCommunities = () => {
    // Simplified Louvain: Node adopts most frequent neighbor community
    const adj = new Map<string, string[]>();
    users.forEach(u => adj.set(u.id, []));
    edges.forEach(e => {
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source); // undirected for community detection
    });

    let currentUsers = [...users];
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      currentUsers = currentUsers.map(u => {
        const neighbors = adj.get(u.id) || [];
        if (neighbors.length === 0) return u;
        
        const commCounts: Record<number, number> = {};
        neighbors.forEach(nId => {
          const nComm = currentUsers.find(x => x.id === nId)?.community;
          if (nComm !== undefined) commCounts[nComm] = (commCounts[nComm] || 0) + 1;
        });

        let bestComm = u.community;
        let maxCount = 0;
        for (const [comm, count] of Object.entries(commCounts)) {
          if (count > maxCount) { maxCount = count; bestComm = parseInt(comm); }
        }

        if (bestComm !== u.community) {
          changed = true;
          return { ...u, community: bestComm };
        }
        return u;
      });
    }

    // Remap communities to 1..5
    const commSet = new Set(currentUsers.map(u => u.community));
    const sortedComms = Array.from(commSet).slice(0, 5); // cap at 5
    currentUsers = currentUsers.map(u => {
      const idx = sortedComms.indexOf(u.community);
      return { ...u, community: idx === -1 ? 1 : idx + 1 };
    });

    setUsers(currentUsers);
    notify('🔍 Community detection complete');
  };

  return (
    <AppContext.Provider value={{ 
      users, edges, posts, sharePost, flagPost, 
      theme, toggleTheme, notification, notify, history, addHistory, detectCommunities
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
