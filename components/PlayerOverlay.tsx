"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

export default function PlayerOverlay({
  open,
  onClose,
  title,
  src,
  matchId
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  src: string;
  matchId?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const backoffRef = useRef<number>(2000);
  const timerRef = useRef<any>(null);

  // Reset internal src when the incoming src changes
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const computedSrc = useMemo(() => {
    const base = currentSrc || src;
    try {
      const u = new URL(base, typeof window !== 'undefined' ? window.location.href : undefined);
      if (u.hostname.includes('youtube.com')) {
        if (!u.searchParams.has('origin') && typeof window !== 'undefined') {
          u.searchParams.set('origin', window.location.origin);
        }
        if (!u.searchParams.has('playsinline')) u.searchParams.set('playsinline', '1');
        if (!u.searchParams.has('rel')) u.searchParams.set('rel', '0');
      }
      return u.toString();
    } catch {
      return base;
    }
  }, [src, currentSrc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Solid backdrop (no blur) to avoid costly repaints/flicker */}
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />
      <div className="absolute inset-0 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-5xl surface shadow-glow">
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10">
            <div className="text-sm md:text-base font-semibold line-clamp-1">{title}</div>
            <button onClick={onClose} className="pill pill-muted">Close</button>
          </div>
          <div className="w-full aspect-video bg-black">
            <iframe
              title={title}
              src={computedSrc}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


