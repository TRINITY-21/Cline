'use client';

import { useState } from 'react';
import type { Comment } from '../data';

export function CommentsSection({ matchId, initialComments }: { matchId: string; initialComments: Comment[] }) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: authorName,
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
      <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
        <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
        Comments & Discussion
      </h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-white/20 transition-all">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(var(--brand-yellow))] to-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-white/20">
            {authorName ? getInitials(authorName) : '👤'}
          </div>
          <div className="flex-1 space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-yellow))]/50 focus:border-[rgb(var(--brand-yellow))]/50 transition-all"
              required
            />
            <textarea
              placeholder="Share your thoughts about this match..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-yellow))]/50 focus:border-[rgb(var(--brand-yellow))]/50 transition-all resize-none"
              required
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </div>
              <button
                type="submit"
                className="btn btn-primary px-6 py-2 text-sm font-semibold hover:scale-105 transition-transform"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 opacity-50">💬</div>
            <div className="text-white/60">No comments yet. Be the first to share your thoughts!</div>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-5 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/comment"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(var(--brand-yellow))] to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-white/20 group-hover/comment:scale-110 transition-transform">
                  {comment.avatar ? (
                    <img src={comment.avatar} alt={comment.author} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(comment.author)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white group-hover/comment:text-[rgb(var(--brand-yellow))] transition-colors">
                      {comment.author}
                    </span>
                    <span className="text-xs text-white/50">•</span>
                    <span className="text-xs text-white/50">{formatTime(comment.timestamp)}</span>
                  </div>
                  <p className="text-white/90 leading-relaxed mb-3 whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-xs text-white/60 hover:text-[rgb(var(--brand-yellow))] transition-colors group/like">
                      <svg className="w-4 h-4 group-hover/like:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span>{comment.likes || 0}</span>
                    </button>
                    <button className="text-xs text-white/60 hover:text-[rgb(var(--brand-yellow))] transition-colors">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

