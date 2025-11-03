"use client";

import {
    copyToClipboard,
    generateShareText,
    generateShareTitle,
    generateShareUrl,
    getFacebookShareUrl,
    getTelegramShareUrl,
    getTwitterShareUrl,
    getWhatsAppShareUrl,
    isWebShareSupported,
    shareViaWebShare,
    type ShareData,
} from '@/lib/social-share';
import { useEffect, useRef, useState } from 'react';

interface ShareButtonProps {
  matchData: {
    home: string;
    away: string;
    league?: string;
    time?: string;
    isLive?: boolean;
    matchId?: string;
  };
  className?: string;
  variant?: 'icon' | 'button';
  onClick?: (e: React.MouseEvent) => void;
}

export default function ShareButton({ matchData, className = '', variant = 'icon', onClick }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shareData: ShareData = {
    title: '',
    text: '',
    url: '', // Will be set below
    team1: matchData.home,
    team2: matchData.away,
    league: matchData.league,
    time: matchData.time,
    isLive: matchData.isLive,
  };

  // Generate share URL and text
  const shareUrl = typeof window !== 'undefined' ? generateShareUrl(shareData, matchData.matchId) : '';
  shareData.url = shareUrl;
  shareData.title = generateShareTitle(shareData);
  shareData.text = generateShareText(shareData);

  const handleWebShare = async () => {
    const success = await shareViaWebShare(shareData);
    if (success) {
      setIsOpen(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareData.url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    }
  };

  const handleShare = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = getWhatsAppShareUrl(shareData);
        break;
      case 'telegram':
        url = getTelegramShareUrl(shareData);
        break;
      case 'twitter':
        url = getTwitterShareUrl(shareData);
        break;
      case 'facebook':
        url = getFacebookShareUrl(shareData);
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      setIsOpen(false);
    }
  };

  if (variant === 'button') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30 flex items-center gap-2 ${className}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[998]"
              onClick={() => setIsOpen(false)}
            />
          <div className="absolute top-full right-0 mt-2 z-[999] bg-[rgb(15,15,20)] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[220px] backdrop-blur-xl" style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
            {isWebShareSupported() && (
              <button
                onClick={handleWebShare}
                className="w-full px-4 py-3 rounded-lg text-left hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 flex items-center gap-3 mb-1 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgb(var(--brand-yellow))]/20 to-[rgb(var(--brand-yellow))]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/90">Native Share</span>
              </button>
            )}
            
            <button
              onClick={() => handleShare('whatsapp')}
              className="w-full px-4 py-3 rounded-lg text-left hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-500/5 transition-all duration-200 flex items-center gap-3 mb-1 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-lg">💚</span>
              </div>
              <span className="text-sm font-medium text-white/90">WhatsApp</span>
            </button>

            <button
              onClick={() => handleShare('telegram')}
              className="w-full px-4 py-3 rounded-lg text-left hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-500/5 transition-all duration-200 flex items-center gap-3 mb-1 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-lg">✈️</span>
              </div>
              <span className="text-sm font-medium text-white/90">Telegram</span>
            </button>

            <button
              onClick={() => handleShare('twitter')}
              className="w-full px-4 py-3 rounded-lg text-left hover:bg-gradient-to-r hover:from-sky-500/10 hover:to-sky-500/5 transition-all duration-200 flex items-center gap-3 mb-1 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-lg">🐦</span>
              </div>
              <span className="text-sm font-medium text-white/90">Twitter/X</span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="w-full px-4 py-3 rounded-lg text-left hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-blue-600/5 transition-all duration-200 flex items-center gap-3 mb-1 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-700/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-lg">📘</span>
              </div>
              <span className="text-sm font-medium text-white/90">Facebook</span>
            </button>

            <div className="border-t border-white/10 my-1.5" />

            <button
              onClick={handleCopyLink}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-200 flex items-center gap-3 group ${
                copied
                  ? 'bg-green-500/10 hover:bg-green-500/15'
                  : 'hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5'
              }`}
            >
              {copied ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-white/90">Copy Link</span>
                </>
              )}
            </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Position dropdown when opened
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      
      // Calculate position - try above first, fallback to below
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const dropdownHeight = 350; // Approximate height
      
      if (spaceAbove > dropdownHeight || spaceAbove > spaceBelow) {
        // Position above
        dropdown.style.top = `${buttonRect.top - dropdownHeight - 8}px`;
        dropdown.style.left = `${buttonRect.right - 200}px`; // min-w-[200px]
      } else {
        // Position below
        dropdown.style.top = `${buttonRect.bottom + 8}px`;
        dropdown.style.left = `${buttonRect.right - 200}px`;
      }
      
      // Ensure it stays within viewport
      const rect = dropdown.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        dropdown.style.left = `${window.innerWidth - rect.width - 16}px`;
      }
      if (rect.left < 0) {
        dropdown.style.left = '16px';
      }
    }
  }, [isOpen]);

  // Icon variant (for match cards)
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          onClick?.(e);
          setIsOpen(!isOpen);
        }}
        className={`p-1.5 rounded-lg transition-all duration-200 touch-manipulation relative ${
          isOpen
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
        } ${className}`}
        title="Share match"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div 
            ref={dropdownRef}
            className="fixed z-[9999] bg-[rgb(15,15,20)] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[200px] backdrop-blur-xl" 
            style={{ animation: 'fadeIn 0.2s ease-out forwards' }}
          >
            {isWebShareSupported() && (
              <button
                onClick={handleWebShare}
                className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-200 flex items-center gap-2.5 mb-1 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgb(var(--brand-yellow))]/20 to-[rgb(var(--brand-yellow))]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-white/90">Native Share</span>
              </button>
            )}
            
            <button
              onClick={() => handleShare('whatsapp')}
              className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-500/5 transition-all duration-200 flex items-center gap-2.5 mb-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base">💚</span>
              </div>
              <span className="text-xs font-medium text-white/90">WhatsApp</span>
            </button>

            <button
              onClick={() => handleShare('telegram')}
              className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-500/5 transition-all duration-200 flex items-center gap-2.5 mb-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base">✈️</span>
              </div>
              <span className="text-xs font-medium text-white/90">Telegram</span>
            </button>

            <button
              onClick={() => handleShare('twitter')}
              className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-gradient-to-r hover:from-sky-500/10 hover:to-sky-500/5 transition-all duration-200 flex items-center gap-2.5 mb-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base">🐦</span>
              </div>
              <span className="text-xs font-medium text-white/90">Twitter/X</span>
            </button>

            <button
              onClick={() => handleShare('facebook')}
              className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-blue-600/5 transition-all duration-200 flex items-center gap-2.5 mb-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-700/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base">📘</span>
              </div>
              <span className="text-xs font-medium text-white/90">Facebook</span>
            </button>

            <div className="border-t border-white/10 my-1.5" />

            <button
              onClick={handleCopyLink}
              className={`w-full px-3 py-2.5 rounded-lg text-left transition-all duration-200 flex items-center gap-2.5 group ${
                copied
                  ? 'bg-green-500/10 hover:bg-green-500/15'
                  : 'hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5'
              }`}
            >
              {copied ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

