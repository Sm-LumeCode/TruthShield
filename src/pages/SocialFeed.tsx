import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShieldAlert, Flag, MessageSquare, Heart, Repeat2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SocialFeed() {
  const { posts, users, sharePost, flagPost } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'flagged' | 'shared'>('all');

  const filteredPosts = posts.filter(post => {
    if (filter === 'flagged') return post.infected;
    return true;
  }).sort((a, b) => {
    if (filter === 'shared') return b.shares - a.shares;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Social Feed</h2>
          <p className="text-sm text-gray-400 mt-1">Live monitoring of network activity.</p>
        </div>
        
        {/* Filters */}
        <div className="flex bg-background border border-white/10 rounded-lg p-1">
          {(['all', 'flagged', 'shared'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                filter === f 
                  ? "bg-white/10 text-white" 
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              {f === 'shared' ? 'Most Shared' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filteredPosts.map(post => {
          const author = users.find(u => u.id === post.authorId);
          if (!author) return null;

          return (
            <div key={post.id} className="bg-surface border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors shadow-sm relative overflow-hidden">
              {/* Flagged Banner */}
              {post.infected && (
                <div className="absolute top-0 left-0 right-0 bg-shieldRed text-white text-xs font-bold py-1 px-4 flex items-center justify-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  ⚠️ Misinformation Detected
                </div>
              )}
              
              <div className={cn("flex gap-4", post.infected && "pt-6")}>
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-shieldBlue/20 border border-shieldBlue/30 flex items-center justify-center shrink-0 text-shieldBlue font-bold text-lg">
                  {author.avatar}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-200 truncate">{author.name}</span>
                    <span className="text-sm text-gray-500 truncate">{author.username}</span>
                    <span className="text-sm text-gray-500">·</span>
                    <span className="text-sm text-gray-500">{post.timestamp.toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-white mt-2 text-[15px] leading-relaxed">
                    {post.content}
                  </p>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 max-w-md text-gray-400">
                    <button className="flex items-center gap-2 hover:text-shieldBlue transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-shieldBlue/10 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{Math.floor(Math.random() * 20)}</span>
                    </button>
                    
                    <button 
                      onClick={() => sharePost(post.id)}
                      className="flex items-center gap-2 hover:text-shieldGreen transition-colors group"
                    >
                      <div className="p-2 rounded-full group-hover:bg-shieldGreen/10 transition-colors">
                        <Repeat2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{post.shares}</span>
                    </button>

                    <button className="flex items-center gap-2 hover:text-shieldRed transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-shieldRed/10 transition-colors">
                        <Heart className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{Math.floor(Math.random() * 50)}</span>
                    </button>

                    <button 
                      onClick={() => flagPost(post.id)}
                      disabled={post.infected}
                      className={cn(
                        "flex items-center gap-2 transition-colors group",
                        post.infected 
                          ? "text-shieldRed/50 cursor-not-allowed" 
                          : "hover:text-shieldRed"
                      )}
                      title="Mark as Misinformation"
                    >
                      <div className={cn(
                        "p-2 rounded-full transition-colors",
                        !post.infected && "group-hover:bg-shieldRed/10"
                      )}>
                        <Flag className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No posts found.
          </div>
        )}
      </div>
    </div>
  );
}
