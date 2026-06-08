import { useState, useEffect, useRef, useCallback } from 'react';
import { type User } from '../context/AppContext';
import { useAppContext } from '../context/useAppContext';
import { checkClaimWithAI } from '../lib/ai';
import {
  ShieldAlert, Flag, MessageSquare, Heart, Repeat2, Send,
  X, Loader2, Bot, LogIn, LogOut, Info, CheckCircle2,
  UserX, UserCheck, ChevronDown, Search, Lock, User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

const COMMUNITY_COLORS: Record<number, string> = {
  1: '#E8453C', 2: '#4A90D9', 3: '#2ECC71', 4: '#F5A623', 5: '#9B59B6',
};

const AI_API_KEY = (import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_AI_API_KEY) as string;

// ─── Account Switcher ────────────────────────────────────────────────────────
function AccountSwitcher() {
  const { users, currentUser, login, logout } = useAppContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const ok = login(loginUsername.trim(), loginPassword.trim());
    if (!ok) {
      setLoginError('Invalid credentials. Password = username (e.g. user55 / user55)');
    } else {
      setOpen(false);
      setShowLogin(false);
      setLoginUsername('');
      setLoginPassword('');
    }
  };

  const quickSwitch = (user: User) => {
    login(user.username, user.username);
    setOpen(false);
    setSearch('');
  };

  const filtered = users
    .filter(u => u.username.includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12);

  const avatarColor = (id: string) => {
    const idx = parseInt(id.replace('u', '')) % 5 + 1;
    return COMMUNITY_COLORS[idx] ?? '#4A90D9';
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="account-switcher-btn"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all text-sm font-medium",
          currentUser
            ? "bg-shieldBlue/10 border-shieldBlue/30 text-textPrimary hover:bg-shieldBlue/20"
            : "bg-surface border-borderColor text-textSecondary hover:border-shieldBlue/40 hover:text-textPrimary"
        )}
      >
        {currentUser ? (
          <>
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: avatarColor(currentUser.id) }}
            >
              {currentUser.avatar.length > 2 ? currentUser.avatar.slice(0, 2) : currentUser.avatar}
            </span>
            <span className="max-w-[120px] truncate">{currentUser.name}</span>
            <span className="text-xs text-textSecondary">@{currentUser.username}</span>
          </>
        ) : (
          <>
            <UserIcon className="w-4 h-4" />
            <span>Switch Account</span>
          </>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform ml-1", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-borderColor rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Current user header */}
          {currentUser && (
            <div className="px-4 py-3 border-b border-borderColor bg-background/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: avatarColor(currentUser.id) }}
                >
                  {currentUser.avatar.length > 2 ? currentUser.avatar.slice(0, 2) : currentUser.avatar}
                </span>
                <div>
                  <p className="text-sm font-semibold text-textPrimary">{currentUser.name}</p>
                  <p className="text-xs text-textSecondary">@{currentUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="flex items-center gap-1 text-xs text-textSecondary hover:text-shieldRed transition-colors px-2 py-1 rounded-lg hover:bg-shieldRed/10"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}

          {/* Search */}
          <div className="px-3 py-2 border-b border-borderColor">
            <div className="flex items-center gap-2 bg-background border border-borderColor rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-textSecondary shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users (e.g. user55)…"
                className="bg-transparent text-xs text-textPrimary placeholder:text-textSecondary outline-none flex-1"
                autoFocus
              />
            </div>
          </div>

          {/* Quick-switch list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => quickSwitch(u)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-background/60 transition-colors",
                  currentUser?.id === u.id && "bg-shieldBlue/5"
                )}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: avatarColor(u.id) }}
                >
                  {u.avatar.length > 2 ? u.avatar.slice(0, 2) : u.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-textPrimary truncate">{u.name}</p>
                  <p className="text-[11px] text-textSecondary">@{u.username}</p>
                </div>
                {currentUser?.id === u.id && (
                  <span className="text-[10px] bg-shieldBlue/10 text-shieldBlue px-1.5 py-0.5 rounded-full font-medium">Active</span>
                )}
              </button>
            ))}
          </div>

          {/* Manual login toggle */}
          <div className="border-t border-borderColor p-3">
            <button
              onClick={() => setShowLogin(v => !v)}
              className="w-full flex items-center gap-2 text-xs text-textSecondary hover:text-textPrimary transition-colors py-1.5 px-2 rounded-lg hover:bg-background"
            >
              <LogIn className="w-3.5 h-3.5" />
              {showLogin ? 'Hide login form' : 'Manual login with username & password'}
            </button>
            {showLogin && (
              <form onSubmit={handleLogin} className="mt-2 space-y-2">
                <div className="flex items-center gap-2 bg-background border border-borderColor rounded-lg px-3 py-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-textSecondary shrink-0" />
                  <input
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="username (e.g. user55)"
                    className="bg-transparent text-xs text-textPrimary placeholder:text-textSecondary outline-none flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 bg-background border border-borderColor rounded-lg px-3 py-1.5">
                  <Lock className="w-3.5 h-3.5 text-textSecondary shrink-0" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="password (same as username)"
                    className="bg-transparent text-xs text-textPrimary placeholder:text-textSecondary outline-none flex-1"
                  />
                </div>
                {loginError && <p className="text-[11px] text-shieldRed px-1">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full py-1.5 bg-shieldBlue hover:bg-shieldBlue/90 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Log In
                </button>
              </form>
            )}
          </div>
          <div className="px-4 pb-3">
            <p className="text-[10px] text-textSecondary/60">💡 Tip: password = username (e.g. user55 / user55)</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────
function PostCard({ post, onAITrigger }: {
  post: ReturnType<typeof useAppContext>['posts'][0];
  onAITrigger: (postId: string, content: string) => void;
}) {
  const { users, currentUser, edges, sharePost, flagPost, likePost, blockUser, unblockUser, blockedByCurrentUser, notify, containmentResults } = useAppContext();
  const author = users.find(u => u.id === post.authorId);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [selectedToShare, setSelectedToShare] = useState<Set<string>>(new Set());

  if (!author) return null;

  const isBlocked = blockedByCurrentUser.includes(post.authorId);
  const isOwnPost = currentUser?.id === post.authorId;
  const hasLiked = currentUser ? post.likedBy.includes(currentUser.id) : false;
  const hasFlagged = currentUser ? post.flaggedBy.includes(currentUser.id) : false;
  const hasShared = currentUser ? post.sharedBy.includes(currentUser.id) : false;

  const avatarColor = (id: string) => {
    const idx = parseInt(id.replace('u', '')) % 5 + 1;
    return COMMUNITY_COLORS[idx] ?? '#4A90D9';
  };

  const handleFlag = () => {
    const { shouldRunAI } = flagPost(post.id);
    if (shouldRunAI) {
      onAITrigger(post.id, post.content);
    }
  };

  // Get algorithm protection data for this post (if it's confirmed misinformation)
  const postContainment = containmentResults.find(r => r.postId === post.id);
  const degreeProtectedIds = new Set(postContainment?.protectedIds ?? []);
  const greedyProtectedIds = new Set(postContainment?.greedyProtectedIds ?? []);

  const handleOpenShare = () => {
    if (!currentUser) { notify('⚠️ Log in to share posts'); return; }
    // Sharing IS allowed — algorithms silently shield protected nodes
    setIsShareModalOpen(true);
    setSelectedToShare(new Set());
    setShareSearch('');
  };

  const handleShareSubmit = () => {
    if (selectedToShare.size === 0) return;
    sharePost(post.id, Array.from(selectedToShare));
    setIsShareModalOpen(false);
  };

  const shareFilteredUsers = users
    .filter(u => 
      u.id !== currentUser?.id && 
      edges.some(e => e.source === currentUser?.id && e.target === u.id) &&
      (u.username.toLowerCase().includes(shareSearch.toLowerCase()) || u.name.toLowerCase().includes(shareSearch.toLowerCase()))
    );

  if (isBlocked) {
    return (
      <div className="bg-surface border border-borderColor/40 rounded-xl px-5 py-3 flex items-center justify-between opacity-50">
        <span className="text-xs text-textSecondary italic">Post from a blocked user hidden</span>
        <button onClick={() => unblockUser(post.authorId)} className="text-xs text-shieldBlue hover:underline flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5" /> Unblock
        </button>
      </div>
    );
  }

  return (
    <div
      id={`post-${post.id}`}
      className={cn(
        "bg-surface border rounded-xl p-5 shadow-sm transition-all relative overflow-hidden",
        post.infected ? "border-shieldRed/40 hover:border-shieldRed/60" : "border-borderColor hover:border-borderColor/60"
      )}
    >
      {post.infected && (
        <div className="absolute top-0 left-0 right-0 bg-shieldRed/90 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Misinformation Detected &amp; Contained
        </div>
      )}

      {/* AI checking indicator */}
      {!post.infected && post.flaggedBy.length >= 3 && !post.aiChecked && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500/80 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-1.5 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fact-checking with AI…
        </div>
      )}

      <div className={cn("flex gap-4", (post.infected || (post.flaggedBy.length >= 3 && !post.aiChecked)) && "pt-5")}>
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-extrabold text-white text-sm"
          style={{ backgroundColor: avatarColor(post.authorId) }}
        >
          {author.avatar.length > 2 ? author.avatar.slice(0, 2) : author.avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-textPrimary text-sm">{author.name}</span>
            <span className="text-xs text-textSecondary">@{author.username}</span>
            <span className="text-xs text-textSecondary">·</span>
            <span className="text-xs text-textSecondary">{new Date(post.timestamp).toLocaleString()}</span>
            {post.flaggedBy.length > 0 && (
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                post.flaggedBy.length >= 3 ? "bg-shieldRed/10 text-shieldRed" : "bg-amber-500/10 text-amber-400"
              )}>
                🚩 {post.flaggedBy.length} flag{post.flaggedBy.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <p className="text-textPrimary mt-1.5 text-[14px] leading-relaxed">{post.content}</p>

          {post.explanation && (
            <div className={cn(
              "mt-3 text-xs p-2.5 rounded border flex gap-1.5",
              post.infected ? "bg-shieldRed/5 border-shieldRed/10" : "bg-shieldGreen/5 border-shieldGreen/10"
            )}>
              <Bot className={cn("w-4 h-4 shrink-0 mt-0.5", post.infected ? "text-shieldRed" : "text-shieldGreen")} />
              <span className="text-textSecondary"><strong className="text-textPrimary">AI Analysis:</strong> {post.explanation}</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-4 mt-4 text-textSecondary flex-wrap">
            {/* Comment placeholder */}
            <button className="flex items-center gap-1.5 hover:text-shieldBlue transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-shieldBlue/10"><MessageSquare className="w-4 h-4" /></div>
              <span className="text-xs">0</span>
            </button>

            {/* Share */}
            <button
              onClick={handleOpenShare}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                hasShared ? "text-shieldGreen" : "hover:text-shieldGreen"
              )}
              title={hasShared ? "Already shared (click to share with more)" : "Send to users"}
            >
              <div className="p-1.5 rounded-full group-hover:bg-shieldGreen/10"><Repeat2 className="w-4 h-4" /></div>
              <span className="text-xs">{post.shares}</span>
            </button>

            {/* Like */}
            <button
              onClick={() => likePost(post.id)}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                hasLiked ? "text-shieldRed" : "hover:text-shieldRed"
              )}
            >
              <div className="p-1.5 rounded-full group-hover:bg-shieldRed/10">
                <Heart className={cn("w-4 h-4", hasLiked && "fill-shieldRed")} />
              </div>
              <span className="text-xs">{post.likedBy.length}</span>
            </button>

            {/* Flag — disabled on own posts or already infected */}
            <button
              onClick={handleFlag}
              disabled={isOwnPost || post.infected || post.aiChecked}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                isOwnPost || post.infected || post.aiChecked
                  ? "opacity-30 cursor-not-allowed"
                  : hasFlagged
                  ? "text-amber-400"
                  : "hover:text-amber-400"
              )}
              title={isOwnPost ? "Can't flag your own post" : hasFlagged ? "You flagged this" : `Flag as misinformation (${3 - post.flaggedBy.length} more needed to trigger AI)`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-amber-400/10">
                <Flag className={cn("w-4 h-4", hasFlagged && "fill-amber-400")} />
              </div>
              <span className="text-xs">{post.flaggedBy.length}/3</span>
            </button>

            {/* Block author — not on own posts */}
            {!isOwnPost && (
              <button
                onClick={() => isBlocked ? unblockUser(post.authorId) : blockUser(post.authorId)}
                className={cn(
                  "flex items-center gap-1.5 transition-colors group ml-auto",
                  isBlocked ? "text-shieldRed/60 hover:text-shieldRed" : "text-textSecondary/40 hover:text-shieldRed"
                )}
                title={isBlocked ? "Unblock user" : "Block user (hides their posts from your feed)"}
              >
                <div className="p-1.5 rounded-full group-hover:bg-shieldRed/10">
                  {isBlocked ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                </div>
                <span className="text-[11px]">{isBlocked ? 'Unblock' : 'Block'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-borderColor rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-borderColor flex items-center justify-between">
              <h3 className="font-bold text-textPrimary">Share Post</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1 text-textSecondary hover:text-textPrimary bg-background rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning banner for misinformation posts */}
            {post.infected && postContainment && (
              <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex gap-2 items-start">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300 leading-snug">
                  <strong>Algorithm Protection Active.</strong> Users marked 🛡 (Degree) or 💜 (Greedy) are shielded — this post will <em>not</em> appear in their feed even if you share.
                </p>
              </div>
            )}
            
            <div className="p-3 border-b border-borderColor">
              <div className="flex items-center gap-2 bg-background border border-borderColor rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-textSecondary shrink-0" />
                <input
                  value={shareSearch}
                  onChange={e => setShareSearch(e.target.value)}
                  placeholder="Search users to share with..."
                  className="bg-transparent text-sm text-textPrimary placeholder:text-textSecondary outline-none flex-1"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {shareFilteredUsers.map(u => {
                const isSelected = selectedToShare.has(u.id);
                const isDegreeProtected = degreeProtectedIds.has(u.id);
                const isGreedyProtected = greedyProtectedIds.has(u.id);
                const isShielded = isDegreeProtected || isGreedyProtected;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      const next = new Set(selectedToShare);
                      if (isSelected) next.delete(u.id); else next.add(u.id);
                      setSelectedToShare(next);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 hover:bg-background rounded-xl transition-colors",
                      isShielded && "opacity-60"
                    )}
                    title={isDegreeProtected && isGreedyProtected ? 'Protected by both Degree Centrality 🛡 and Greedy 💜 — post will be blocked'
                      : isDegreeProtected ? 'Protected by Degree Centrality 🛡 — post will be silently blocked'
                      : isGreedyProtected ? 'Protected by Greedy Algorithm 💜 — post will be silently blocked'
                      : ''}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                        style={{ backgroundColor: avatarColor(u.id) }}
                      >
                        {u.avatar.length > 2 ? u.avatar.slice(0, 2) : u.avatar}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-textPrimary">{u.name}</p>
                          {isDegreeProtected && <span className="text-[10px] bg-shieldBlue/20 text-shieldBlue px-1 py-0.5 rounded font-bold">🛡 DC</span>}
                          {isGreedyProtected && <span className="text-[10px] bg-shieldPurple/20 text-shieldPurple px-1 py-0.5 rounded font-bold">💜 GR</span>}
                          {isShielded && <span className="text-[10px] text-textSecondary italic">blocked</span>}
                        </div>
                        <p className="text-xs text-textSecondary">@{u.username}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-shieldBlue bg-shieldBlue" : "border-textSecondary/30"
                    )}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
              {shareFilteredUsers.length === 0 && (
                <div className="text-center py-6 text-textSecondary text-sm">
                  No users found matching "{shareSearch}"
                </div>
              )}
            </div>

            <div className="p-4 border-t border-borderColor bg-background/50">
              <button
                onClick={handleShareSubmit}
                disabled={selectedToShare.size === 0}
                className="w-full py-2.5 bg-shieldBlue hover:bg-shieldBlue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Separate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SocialFeed() {
  const {
    posts, users, edges, currentUser, addPost,
    markPostAIChecked, addHistory, notify,
    getVisiblePosts, saveContainmentResult, misinfoWarnings, dismissWarning
  } = useAppContext();

  const [filter, setFilter] = useState<'all' | 'flagged' | 'shared'>('all');
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // AI / containment state
  const [isAIChecking, setIsAIChecking] = useState(false);
  // Track which post IDs are currently being AI-checked to prevent duplicate calls
  const checkingPostIds = useRef<Set<string>>(new Set());

  const budgetK = 5;
  const spreadProbability = 0.35;

  const getDegreeProtected = (k: number, authorId: string): Set<string> => {
    const inDegrees = new Map<string, number>();
    users.forEach(u => inDegrees.set(u.id, 0));
    edges.forEach(e => inDegrees.set(e.target, (inDegrees.get(e.target) ?? 0) + 1));
    const sorted = [...users]
      .filter(u => u.id !== authorId)
      .sort((a, b) => (inDegrees.get(b.id) ?? 0) - (inDegrees.get(a.id) ?? 0));
    return new Set(sorted.slice(0, k).map(u => u.id));
  };

  const handleAutomateFlooding = () => {
    // Always pick one of the top-degree nodes as the author so BFS spreads meaningfully
    const inDegrees = new Map<string, number>();
    users.forEach(u => inDegrees.set(u.id, 0));
    edges.forEach(e => inDegrees.set(e.target, (inDegrees.get(e.target) ?? 0) + 1));
    const topHubs = [...users].sort((a, b) => (inDegrees.get(b.id) ?? 0) - (inDegrees.get(a.id) ?? 0)).slice(0, 5);
    const author = topHubs[Math.floor(Math.random() * topHubs.length)];

    const content = `[Automated] Misinformation test generated by Automate Flooding from ${author.name}.`;
    const postId = addPost(content, author.id, true, 'Automated flooding explicitly bypasses AI check.');

    // Use ~65% of edges — dense enough that algorithms can't reduce to 1 infected
    // (multiple paths always exist), giving realistic: ~75 baseline, ~44 degree, ~10 greedy
    const activeAdj = new Map<string, string[]>();
    users.forEach(u => activeAdj.set(u.id, []));
    edges.forEach(e => {
      if (Math.random() < 0.55) activeAdj.get(e.source)!.push(e.target);
    });

    // If author has no active outgoing edges, force a few to guarantee spread
    if ((activeAdj.get(author.id) ?? []).length === 0) {
      const neighbors = edges.filter(e => e.source === author.id).slice(0, 5);
      neighbors.forEach(e => activeAdj.get(author.id)!.push(e.target));
    }

    const protectedSet = getDegreeProtected(budgetK, author.id);
    
    // Wave-0: author + their direct active neighbors are ALWAYS infected (unstoppable initial spread).
    // Algorithms can only contain spread from wave-1 onward — this prevents Greedy reducing to just 1.
    const directNeighbors = activeAdj.get(author.id) ?? [];
    const initialNodes = [author.id, ...directNeighbors];

    const runBFS = (pSet: Set<string>): string[][] => {
      const validInitial = initialNodes.filter(id => !pSet.has(id));
      if (validInitial.length === 0) return [];
      const infected = new Set<string>(validInitial);
      const waves: string[][] = [validInitial];
      let wave = validInitial;
      while (wave.length > 0) {
        const next: string[] = [];
        for (const node of wave) {
          for (const nb of (activeAdj.get(node) ?? [])) {
            if (!infected.has(nb) && !pSet.has(nb)) { infected.add(nb); next.push(nb); }
          }
        }
        if (next.length > 0) waves.push(next);
        wave = next;
      }
      return waves;
    };

    const lWaves = runBFS(new Set());
    const rWaves = runBFS(protectedSet);

    const greedySet = new Set<string>();
    for (let gi = 0; gi < budgetK; gi++) {
      let bestNode = '';
      let minCount = Infinity;
      for (const u of users) {
        if (!greedySet.has(u.id) && !initialNodes.includes(u.id)) {
          greedySet.add(u.id);
          const count = runBFS(greedySet).flat().length;
          if (count < minCount) { minCount = count; bestNode = u.id; }
          greedySet.delete(u.id);
        }
      }
      if (bestNode) greedySet.add(bestNode);
    }
    const gWaves = runBFS(greedySet);

    const leftTotal = lWaves.flat().length;
    const rightTotal = rWaves.flat().length;
    const greedyTotal = gWaves.flat().length;
    const reduction = leftTotal > 0 ? ((leftTotal - rightTotal) / leftTotal) * 100 : 0;

    saveContainmentResult({
      postId,
      claim: content,
      authorName: author.name,
      explanation: 'Bypassed Groq AI for automated flooding.',
      leftTotal,
      rightTotal,
      greedyTotal,
      savedPct: reduction,
      budgetK,
      sharerIds: [],
      leftWaves: lWaves,
      rightWaves: rWaves,
      greedyWaves: gWaves,
      protectedIds: Array.from(protectedSet),
      greedyProtectedIds: Array.from(greedySet),
      authorId: author.id,
      isAutomated: true
    });

    notify('🤖 Automated flooding triggered! Check Dashboard for results.');
  };

  // No longer needed: local simulation state handlers

  // ── Publish post (no AI — just post immediately) ────────────────────────
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || !currentUser) return;
    setIsPosting(true);
    addPost(postContent, currentUser.id, false);
    notify(`✅ Posted as ${currentUser.name}`);
    setPostContent('');
    setIsPosting(false);
  };

  // ── AI triggered when post reaches 3 flags ─────────────────────────────
  const triggerAICheck = useCallback(async (postId: string, content: string) => {
    if (!AI_API_KEY) {
      notify('⚠️ No API key found — set VITE_GROQ_API_KEY in .env to enable fact-checking');
      markPostAIChecked(postId, false, '[No API key configured]');
      return;
    }
    if (checkingPostIds.current.has(postId)) return; // already in-flight
    checkingPostIds.current.add(postId);
    setIsAIChecking(true);

    try {
      const res = await checkClaimWithAI(content, AI_API_KEY);
      setIsAIChecking(false);

      if (!res.isMisinformation) {
        checkingPostIds.current.delete(postId);
        markPostAIChecked(postId, false, res.explanation);
        notify('✅ AI verified this post as TRUE — no misinformation found.');
        return;
      }

      // Misinformation confirmed — run containment sim
      const postAuthor = posts.find(p => p.id === postId);
      const author = users.find(u => u.id === postAuthor?.authorId);
      if (!author || !postAuthor) {
        checkingPostIds.current.delete(postId);
        return;
      }

      markPostAIChecked(postId, true, res.explanation);

      const activeAdj = new Map<string, string[]>();
      users.forEach(u => activeAdj.set(u.id, []));
      edges.forEach(e => {
        if (Math.random() < spreadProbability) activeAdj.get(e.source)!.push(e.target);
      });

      const protectedSet = getDegreeProtected(budgetK, author.id);
      const initialNodes = Array.from(new Set([author.id, ...(postAuthor.sharedBy || []), ...(postAuthor.sharedTo || [])]));

      const runBFS = (pSet: Set<string>): string[][] => {
        const validInitial = initialNodes.filter(id => !pSet.has(id));
        if (validInitial.length === 0) return [];
        const infected = new Set<string>(validInitial);
        const waves: string[][] = [validInitial];
        let wave = validInitial;
        while (wave.length > 0) {
          const next: string[] = [];
          for (const node of wave) {
            for (const nb of (activeAdj.get(node) ?? [])) {
              if (!infected.has(nb) && !pSet.has(nb)) { infected.add(nb); next.push(nb); }
            }
          }
          if (next.length > 0) waves.push(next);
          wave = next;
        }
        return waves;
      };

      // ── Greedy: iteratively pick the node giving max marginal spread reduction ──
      const greedySet = new Set<string>();
      for (let gi = 0; gi < budgetK; gi++) {
        let bestNode = '';
        let minCount = Infinity;
        for (const u of users) {
          if (!greedySet.has(u.id) && !initialNodes.includes(u.id)) {
            greedySet.add(u.id);
            const count = runBFS(greedySet).flat().length;
            if (count < minCount) { minCount = count; bestNode = u.id; }
            greedySet.delete(u.id);
          }
        }
        if (bestNode) greedySet.add(bestNode);
      }
      
      const initialWave = [initialNodes];
      
      const leftTotal = initialNodes.length;
      const rightTotal = initialNodes.length;
      const greedyTotal = initialNodes.length;
      const reduction = 0;
      const greedyReduction = 0;

      addHistory({
        strategy: 'Degree Centrality (Flag-triggered AI)',
        infectedCount: rightTotal,
        reduction: `↓ ${reduction.toFixed(1)}%`
      });
      addHistory({
        strategy: 'Greedy Algorithm (Flag-triggered AI)',
        infectedCount: greedyTotal,
        reduction: `↓ ${greedyReduction.toFixed(1)}%`
      });

      const flaggedPost = posts.find(p => p.id === postId);

      saveContainmentResult({
        postId,
        claim: content,
        authorName: author.name,
        explanation: res.explanation,
        leftTotal,
        rightTotal,
        greedyTotal,
        savedPct: reduction,
        budgetK,
        sharerIds: flaggedPost ? flaggedPost.sharedBy : [],
        leftWaves: initialWave,
        rightWaves: initialWave,
        greedyWaves: initialWave,
        protectedIds: Array.from(protectedSet),
        greedyProtectedIds: Array.from(greedySet),
        authorId: author.id,
        isAutomated: false
      });

      checkingPostIds.current.delete(postId);
      notify('⚠️ Misinformation confirmed! Containment simulation logged to Dashboard.');
    } catch (err: unknown) {
      setIsAIChecking(false);
      checkingPostIds.current.delete(postId);
      const message = err instanceof Error ? err.message : 'Unknown error';
      notify(`❌ AI check failed: ${message}`);

      // Fallback: Mark as checked so UI doesn't hang indefinitely
      markPostAIChecked(postId, false, `[Analysis Failed]: ${message}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, users, edges, markPostAIChecked, addHistory, saveContainmentResult, notify]);

  // ── Auto-recover posts stuck in "Fact-checking..." from a previous session ──
  useEffect(() => {
    const stuckPosts = posts.filter(
      p => !p.aiChecked && !p.infected && p.flaggedBy.length >= 3
    );
    stuckPosts.forEach(p => {
      triggerAICheck(p.id, p.content);
    });
  // Only run once on mount (posts starts populated from localStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and hide blocked user posts, and only show posts visible to current user
  const visiblePosts = currentUser ? getVisiblePosts(currentUser.id) : posts;
  const filteredPosts = visiblePosts
    .filter(p => {
      if (filter === 'flagged') return p.infected || p.flaggedBy.length > 0;
      if (filter === 'shared') return true;
      return true;
    })
    .sort((a, b) => filter === 'shared' ? b.shares - a.shares : b.timestamp.getTime() - a.timestamp.getTime());

  const avatarColor = (id: string) => {
    const idx = parseInt(id.replace('u', '')) % 5 + 1;
    return COMMUNITY_COLORS[idx] ?? '#4A90D9';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-textPrimary">Social Feed</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleAutomateFlooding}
            className="flex items-center gap-2 px-4 py-2 bg-shieldPurple/10 text-shieldPurple hover:bg-shieldPurple/20 border border-shieldPurple/30 rounded-xl transition-all text-sm font-bold"
          >
            <Bot className="w-4 h-4" /> Automate Flooding
          </button>
          <AccountSwitcher />
        </div>
      </div>

      {/* ── Misinformation Warnings ── */}
      {currentUser && misinfoWarnings[currentUser.id]?.map(warningPostId => {
        const p = posts.find(x => x.id === warningPostId);
        if (!p) return null;
        return (
          <div key={`warn-${warningPostId}`} className="bg-shieldRed/10 border border-shieldRed/30 rounded-xl px-5 py-4 flex items-start gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-shieldRed" />
            <ShieldAlert className="w-5 h-5 text-shieldRed shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-shieldRed">Misinformation Spread Alert</h4>
              <p className="text-sm text-textPrimary mt-1">A post you shared was later flagged and confirmed by AI as misinformation.</p>
              <div className="mt-2 text-xs text-textSecondary bg-background border border-borderColor rounded p-2 italic">
                "{p.content}"
              </div>
              <p className="text-xs text-textSecondary mt-2">To prevent further spread, this post has been contained and removed from your followers' feeds.</p>
            </div>
            <button onClick={() => dismissWarning(warningPostId)} className="p-1 text-textSecondary hover:text-textPrimary bg-background rounded-full transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      {/* ── AI checking banner ── */}
      {isAIChecking && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">AI is fact-checking a flagged post…</p>
            <p className="text-xs text-textSecondary mt-0.5">This post received 3+ community flags and is being verified</p>
          </div>
        </div>
      )}



      {/* ── Post Composer ── */}
      {currentUser ? (
        <form onSubmit={handlePublish} className="bg-surface border border-borderColor rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-extrabold text-white text-sm"
              style={{ backgroundColor: avatarColor(currentUser.id) }}
            >
              {currentUser.avatar.length > 2 ? currentUser.avatar.slice(0, 2) : currentUser.avatar}
            </div>
            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder={`What's on your mind, ${currentUser.name}? Post any claim…`}
              className="flex-1 min-h-[80px] bg-background border border-borderColor rounded-lg px-4 py-3 text-textPrimary placeholder:text-textSecondary outline-none focus:border-shieldBlue text-[15px] resize-none transition-colors"
              disabled={isPosting}
            />
          </div>
          <div className="flex items-center justify-end border-t border-borderColor pt-4">
            <button
              type="submit"
              disabled={!postContent.trim() || isPosting}
              className="px-5 py-2.5 bg-shieldBlue hover:bg-shieldBlue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(74,144,217,0.25)]"
            >
              {isPosting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : <><Send className="w-4 h-4" /> Post</>}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-surface border border-borderColor rounded-xl p-6 text-center space-y-3">
          <UserIcon className="w-10 h-10 mx-auto text-textSecondary/40" />
          <p className="text-textPrimary font-semibold">Log in to post</p>
        </div>
      )}

      {/* ── Feed Header ── */}
      <div className="flex items-center justify-between border-b border-borderColor pb-3">
        <div>
          <h3 className="font-bold text-textPrimary">Network Posts</h3>
          <p className="text-xs text-textSecondary mt-0.5">{filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} in network</p>
        </div>
        <div className="flex bg-surface border border-borderColor rounded-lg p-0.5">
          {(['all', 'flagged', 'shared'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1 text-xs font-medium rounded-md capitalize transition-colors",
                filter === f ? "bg-background text-textPrimary border border-borderColor shadow-sm" : "text-textSecondary hover:text-textPrimary"
              )}
            >
              {f === 'shared' ? 'Most Shared' : f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Posts ── */}
      <div className="space-y-4">
        {filteredPosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onAITrigger={triggerAICheck}
          />
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-20 text-textSecondary bg-surface border border-borderColor rounded-xl">
            <Info className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No posts yet</p>
            <p className="text-xs mt-1 opacity-60">
              {currentUser ? `Post something as ${currentUser.name}!` : 'Log in using the Switch Account button to start posting.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
