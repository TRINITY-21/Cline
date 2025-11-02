"use client";

import { useEffect } from 'react';

export default function ScoreBatLivescore() {
  useEffect(() => {
    // Load ScoreBat embed script
    if (typeof window !== 'undefined' && !(window as any).scorebatLoaded) {
      const script = document.createElement('script');
      script.src = 'https://www.scorebat.com/embed/embed.js?v=arrv';
      script.id = 'scorebat-jssdk';
      script.async = true;
      document.body.appendChild(script);
      (window as any).scorebatLoaded = true;
    }
  }, []);

  return (
    <div className="w-full">
      <div className="surface p-4 md:p-6 rounded-xl overflow-hidden">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
            <h3 className="text-lg font-bold text-[rgb(var(--brand-yellow))]">Live Scores</h3>
          </div>
          <p className="text-sm text-white/60">Real-time scores and updates from ScoreBat</p>
        </div>
        
        {/* ScoreBat Widget Container */}
        <div className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-black/20 shadow-lg">
          <iframe
            src="https://www.scorebat.com/embed/livescore/?token=MjUwMjY0XzE3NjIwMzU2NDFfMDVmYjVhNmFjNzRkMTVjYzU4NDNiOGE2ZjdjMjYzZDRiYmY2MWFlOA=="
            frameBorder="0"
            width="100%"
            height="760"
            allowFullScreen
            allow="autoplay; fullscreen"
            className="w-full border-0"
            style={{
              minHeight: '600px',
              height: 'clamp(600px, 760px, 90vh)',
              display: 'block',
            }}
            title="ScoreBat Live Scores"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-white/40">
            Powered by <a 
              href="https://www.scorebat.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[rgb(var(--brand-yellow))]/70 hover:text-[rgb(var(--brand-yellow))] transition-colors underline"
            >
              ScoreBat
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

