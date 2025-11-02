"use client";

import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  matchId: string;
  text: string;
  author: string;
  timestamp: number;
  userId?: string;
}

interface MatchChatProps {
  matchId?: string;
  matchTitle: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function MatchChat({ matchId, matchTitle, isOpen, onToggle, isMobileLayout = false }: MatchChatProps & { isMobileLayout?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to generate username with initials
  const generateUsernameWithInitials = (name?: string): string => {
    let initials = '';
    
    if (name && name.trim()) {
      // Extract initials from provided name
      const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
      if (parts.length >= 2) {
        // Multiple words: first letter of first word + first letter of last word
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        // Single word: just first letter
        initials = parts[0][0].toUpperCase();
      }
    }
    
    // If no name provided or couldn't extract initials, generate random initials
    if (!initials) {
      const randomLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      // 50% chance of 1 letter, 50% chance of 2 letters
      if (Math.random() > 0.5) {
        initials = randomLetters[Math.floor(Math.random() * randomLetters.length)];
      } else {
        initials = randomLetters[Math.floor(Math.random() * randomLetters.length)] + 
                   randomLetters[Math.floor(Math.random() * randomLetters.length)];
      }
    }
    
    // Generate random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000);
    
    return `${initials}_${code}`;
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Initialize author name from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_author_name');
      if (saved && saved.trim()) {
        setAuthorName(saved.trim());
      }
    }
  }, []);

  // Fetch and subscribe to messages
  useEffect(() => {
    if (!matchId || !isOpen) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // For now, using API polling. Later can be upgraded to WebSocket or Firebase Realtime
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${matchId}?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [matchId, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId || isSubmitting) return;

    // Ensure author name is set and saved
    let finalAuthorName = authorName.trim();
    if (!finalAuthorName) {
      // Generate username with initials format (e.g., JA_2345 or J_2353)
      // Generate random initials since no name was provided
      finalAuthorName = generateUsernameWithInitials();
      setAuthorName(finalAuthorName);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_author_name', finalAuthorName);
      }
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/chat/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          author: finalAuthorName,
        }),
      });

      if (res.ok) {
        // Message sent, will appear on next poll
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        setNewMessage(messageText); // Restore message on error
      }
    } catch (err) {
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!matchId) return null;

  return (
    <div
      className={
        isMobileLayout
          ? `w-full h-full transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
          : `fixed right-0 top-0 h-full transition-all duration-300 ease-out ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            }`
      }
      style={
        isMobileLayout
          ? { minHeight: '300px', height: '100%' }
          : { width: 'clamp(320px, 25vw, 400px)', zIndex: 1000 }
      }
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-full flex flex-col shadow-2xl relative overflow-hidden">
        {/* Beautiful Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-black">
          {/* Subtle grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,212,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,212,0,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-yellow))]/5 via-transparent to-[rgb(var(--brand-yellow))]/5 animate-pulse" style={{ animationDuration: '8s' }} />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 h-full flex flex-col border-l border-white/10 backdrop-blur-xl">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10 bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <button
              onClick={onToggle}
              className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 hover:bg-gradient-to-br hover:from-white/10 hover:to-white/5 transition-all flex-shrink-0 group"
              aria-label="Close chat"
            >
              <svg
                className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse flex-shrink-0" />
                <h3 className="text-xs md:text-sm font-bold text-white truncate">Live Chat</h3>
              </div>
              <p className="text-[10px] md:text-xs text-white/50 truncate">{matchTitle}</p>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 md:px-4 py-3 md:py-4 space-y-2 md:space-y-3 relative">
          {/* Fade gradients at top and bottom */}
          <div className="sticky top-0 h-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10 -mt-4" />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[rgb(var(--brand-yellow))]/30 border-t-[rgb(var(--brand-yellow))] rounded-full animate-spin" />
                <div className="animate-pulse text-white/50 text-sm">Loading chat...</div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center relative">
              {/* Decorative background element */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5">
                <svg className="w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="text-5xl mb-4 opacity-80">💬</div>
                <p className="text-sm text-white/70 mb-2 font-medium">No messages yet</p>
                <p className="text-xs text-white/50">Be the first to chat!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id}
                className="flex flex-col gap-1.5 animate-fade-in group"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[rgb(var(--brand-yellow))]/20 to-[rgb(var(--brand-yellow))]/10 border border-[rgb(var(--brand-yellow))]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[rgb(var(--brand-yellow))]">
                      {msg.author.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[rgb(var(--brand-yellow))] truncate max-w-[120px]">
                    {msg.author}
                  </span>
                  <span className="text-[10px] text-white/40">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="bg-gradient-to-br from-white/8 via-white/6 to-white/4 rounded-xl px-4 py-2.5 border border-white/10 backdrop-blur-sm shadow-lg shadow-black/20 hover:border-white/20 transition-all group-hover:shadow-[rgb(var(--brand-yellow))]/10">
                  <p className="text-sm text-white/95 break-words leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))
          )}
          
          <div ref={messagesEndRef} />
          {/* Bottom fade gradient */}
          <div className="sticky bottom-0 h-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-10 -mb-4" />
        </div>

        {/* Author Name Input (if not set) */}
        {!authorName.trim() && (
          <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-md relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[10px] text-white/50">Set your name</span>
            </div>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={authorName}
              onChange={(e) => {
                const name = e.target.value;
                setAuthorName(name);
                // Save to localStorage immediately
                if (typeof window !== 'undefined') {
                  if (name.trim()) {
                    localStorage.setItem('chat_author_name', name.trim());
                  } else {
                    localStorage.removeItem('chat_author_name');
                  }
                }
              }}
              onBlur={(e) => {
                // Convert entered name to initials format when user leaves the field
                const name = e.target.value.trim();
                if (name) {
                  const initialsName = generateUsernameWithInitials(name);
                  setAuthorName(initialsName);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chat_author_name', initialsName);
                  }
                }
              }}
              className="w-full px-3 py-2 text-xs bg-black/40 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[rgb(var(--brand-yellow))]/60 focus:bg-black/50 focus:shadow-lg focus:shadow-[rgb(var(--brand-yellow))]/10 transition-all backdrop-blur-sm"
              maxLength={20}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="p-3 md:p-4 border-t border-white/10 bg-gradient-to-r from-black/95 via-black/90 to-black/95 backdrop-blur-md relative z-10">
          <form onSubmit={handleSendMessage} className="flex gap-1.5 md:gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm bg-black/40 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[rgb(var(--brand-yellow))]/60 focus:bg-black/50 focus:shadow-lg focus:shadow-[rgb(var(--brand-yellow))]/10 transition-all disabled:opacity-50 backdrop-blur-sm"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSubmitting}
              className="px-3 py-2 md:px-5 md:py-2.5 bg-gradient-to-br from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/90 text-black rounded-lg font-semibold text-xs md:text-sm hover:from-[rgb(var(--brand-yellow))]/90 hover:to-[rgb(var(--brand-yellow))]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[rgb(var(--brand-yellow))]/30 hover:shadow-[rgb(var(--brand-yellow))]/40 active:scale-95 flex-shrink-0"
            >
              {isSubmitting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
