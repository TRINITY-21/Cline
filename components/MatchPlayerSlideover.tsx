"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MatchChat from './MatchChat';

type ViewMode = 'normal' | 'theater';

interface StreamSource {
  source: string;
  url: string | null;
  id?: string;
  needsRetry?: boolean;
}

/**
 * Map source names to agent names
 */
const AGENT_NAMES: Record<string, string> = {
  'alpha': 'GPT',
  'bravo': 'CLAUDE',
  'charlie': 'GROK',
  'delta': 'GEMINI',
  'echo': 'DEEPSEEK',
  'foxtrot': 'GPT',
  'golf': 'CLAUDE',
  'hotel': 'GROK',
  'intel': 'GEMINI',
  'initial': 'DEFAULT',
};

// Agent order for cycling (if source not in map, cycle through these)
const AGENT_CYCLE = ['GPT', 'CLAUDE', 'GROK', 'GEMINI', 'DEEPSEEK'];

/**
 * Get agent name for a source
 */
function getAgentName(source: string, index?: number): string {
  if (!source) return 'UNKNOWN';
  const normalized = source.toLowerCase();
  if (AGENT_NAMES[normalized]) {
    return AGENT_NAMES[normalized];
  }
  // If not in map and index provided, cycle through agents
  if (index !== undefined) {
    return AGENT_CYCLE[index % AGENT_CYCLE.length];
  }
  return source.toUpperCase();
}

export default function MatchPlayerSlideover({
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
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Initialize isMobile based on window size (for SSR compatibility, default to false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [availableSources, setAvailableSources] = useState<StreamSource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [lastStallTime, setLastStallTime] = useState<number>(0);
  const [failedSourceIndices, setFailedSourceIndices] = useState<Set<number>>(new Set());
  const [isTryingSources, setIsTryingSources] = useState(false);
  const [iframeErrors, setIframeErrors] = useState<Set<number>>(new Set());
  const [showAgentBadge, setShowAgentBadge] = useState(true);
  const slideoverRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stallCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const sourceVerificationTimeout = useRef<NodeJS.Timeout | null>(null);
  const iframeErrorCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const agentBadgeTimeout = useRef<NodeJS.Timeout | null>(null);
  const availableSourcesRef = useRef<StreamSource[]>([]);
  const currentSourceIndexRef = useRef(0);
  const failedSourceIndicesRef = useRef<Set<number>>(new Set());
  
  // Keep refs in sync with state
  useEffect(() => {
    availableSourcesRef.current = availableSources;
  }, [availableSources]);
  
  useEffect(() => {
    currentSourceIndexRef.current = currentSourceIndex;
  }, [currentSourceIndex]);
  
  useEffect(() => {
    failedSourceIndicesRef.current = failedSourceIndices;
  }, [failedSourceIndices]);

  // Detect mobile/tablet screen size (use lg breakpoint: 1024px)
  // This ensures tablets (768px-1023px) use mobile layout with chat below video
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
    };
    // Check immediately on mount
    checkMobile();
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    // Also check on orientation change for tablets
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Fetch all available sources when matchId is provided
  useEffect(() => {
    if (open && matchId && !availableSources.length) {
      setIsLoadingSources(true);
      
      fetch(`/api/stream-sources/${matchId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.streams && data.streams.length > 0) {
            // Filter to only sources with URLs for initial setup (we'll retry others on demand)
            const sourcesWithUrls = data.streams.filter((s: StreamSource) => s.url);
            const sourcesNeedingRetry = data.streams.filter((s: StreamSource) => !s.url && s.id);
            
            // Check if current src is already in the sources
            const srcInSources = data.streams.some((s: StreamSource) => s.url === src);
            
            let finalSources: StreamSource[] = [];
            
            if (src && !srcInSources) {
              // Current src is not in sources, add it first
              finalSources = [{ source: 'initial', url: src }, ...data.streams];
            } else {
              // Use API sources as-is (including ones needing retry)
              finalSources = data.streams;
            }
            
            setAvailableSources(finalSources);
          } else {
            // Fallback to current src
            setAvailableSources([{ source: 'initial', url: src }]);
          }
          setIsLoadingSources(false);
        })
        .catch(err => {
          setAvailableSources([{ source: 'initial', url: src }]);
          setIsLoadingSources(false);
        });
    } else if (open && !matchId) {
      // No matchId, use single source
      setAvailableSources([{ source: 'initial', url: src }]);
    }
  }, [open, matchId, src, availableSources.length]);

  // Fetch URL for a source that needs retry
  const fetchSourceUrl = useCallback(async (source: StreamSource): Promise<string | null> => {
    if (!source.id || !source.source) {
      return null;
    }
    
    try {
      const response = await fetch(`https://streamed.pk/api/stream/${source.source}/${source.id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      
      const hdStream = data.find((s: any) => s.hd);
      const stream = hdStream || data[0];
      const url = stream.embedUrl || null;
      
      if (url) {
        // Update the source in availableSources
        setAvailableSources(prev => 
          prev.map(s => s.source === source.source && s.id === source.id 
            ? { ...s, url, needsRetry: false }
            : s
          )
        );
      }
      
      return url;
    } catch (error) {
      return null;
    }
  }, []);

  // Reset internal src when sources change or incoming src changes
  useEffect(() => {
    if (availableSources.length > 0 && currentSourceIndex < availableSources.length) {
      const currentSource = availableSources[currentSourceIndex];
      
      // Show badge and hide after 5 seconds when source changes
      setShowAgentBadge(true);
      if (agentBadgeTimeout.current) {
        clearTimeout(agentBadgeTimeout.current);
      }
      agentBadgeTimeout.current = setTimeout(() => {
        setShowAgentBadge(false);
      }, 5000);
      
      if (currentSource.url) {
        // Source has URL, use it
        setCurrentSrc(currentSource.url);
        setStreamError(false);
      } else if (currentSource.needsRetry && currentSource.id) {
        // Source needs retry, fetch URL
        fetchSourceUrl(currentSource).then(url => {
          if (url) {
            setCurrentSrc(url);
            setStreamError(false);
          } else {
            // Failed to fetch URL, mark as error and try next source
            setStreamError(true);
            // Auto-switch to next source after a delay
            setTimeout(() => {
              setFailedSourceIndices(prev => new Set(prev).add(currentSourceIndex));
              tryFindWorkingSource(false);
            }, 1000);
          }
        });
      } else {
        // No URL and can't retry, use fallback
        setCurrentSrc(src || '');
      }
    } else {
      setCurrentSrc(src);
    }
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (agentBadgeTimeout.current) {
        clearTimeout(agentBadgeTimeout.current);
        agentBadgeTimeout.current = null;
      }
    };
  }, [availableSources, currentSourceIndex, src, fetchSourceUrl]);

  const isVideoFile = useMemo(() => {
    const base = currentSrc || src;
    if (!base) return false;
    return base.includes('.mp4') || base.includes('.webm') || base.includes('.m3u8') || 
           base.includes('video/mp4') || base.includes('streamable.com');
  }, [src, currentSrc]);

  // Monitor iframe for errors and console errors (HLS errors)
  useEffect(() => {
    if (!open || isVideoFile) return;

    const currentIdx = currentSourceIndexRef.current;
    
    // Intercept console errors to catch HLS errors
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      const errorMsg = args.join(' ');
      
      // Check for HLS or stream errors
      if (
        errorMsg.includes('hlsjs') || 
        errorMsg.includes('unrecoverable') || 
        errorMsg.includes('fatal error') ||
        errorMsg.includes('500') ||
        errorMsg.includes('404') ||
        errorMsg.includes('Server Error') ||
        errorMsg.includes('playlist.m3u8')
      ) {
        setIframeErrors(prev => new Set(prev).add(currentIdx));
        setStreamError(true);
      }
      
      // Call original console.error
      originalError.apply(console, args);
    };

    // Also check for errors after delay
    if (iframeErrorCheckTimeout.current) {
      clearTimeout(iframeErrorCheckTimeout.current);
    }
    
    // Check after 8 seconds if errors occurred
    iframeErrorCheckTimeout.current = setTimeout(() => {
      // Restore original console.error
      console.error = originalError;
    }, 8000);

    return () => {
      // Restore original console.error
      console.error = originalError;
      if (iframeErrorCheckTimeout.current) {
        clearTimeout(iframeErrorCheckTimeout.current);
        iframeErrorCheckTimeout.current = null;
      }
    };
  }, [open, isVideoFile, currentSourceIndex, iframeErrors]);

  // Reset view mode and chat when opening/closing
  useEffect(() => {
    if (open) {
      setViewMode('normal');
      setIsAnimating(false);
      setIsChatOpen(false);
      setCurrentSourceIndex(0);
      setStreamError(false);
      setIsReloading(false);
      setLastStallTime(0);
      setFailedSourceIndices(new Set());
      setIsTryingSources(false);
      // Reset sources so they can be fetched fresh
      setAvailableSources([]);
      setIsLoadingSources(false);
      if (sourceVerificationTimeout.current) {
        clearTimeout(sourceVerificationTimeout.current);
        sourceVerificationTimeout.current = null;
      }
    } else {
      // Cleanup on close - reset sources
      setAvailableSources([]);
      setCurrentSourceIndex(0);
      if (stallCheckInterval.current) {
        clearInterval(stallCheckInterval.current);
        stallCheckInterval.current = null;
      }
      if (sourceVerificationTimeout.current) {
        clearTimeout(sourceVerificationTimeout.current);
        sourceVerificationTimeout.current = null;
      }
    }
  }, [open, matchId, src]);

  // Verify current source and try next if it fails
  const verifyAndTryNext = useCallback((orderedIndices: number[], currentTryIndex: number, isVideo: boolean, currentIframeErrors: Set<number>) => {
    if (currentTryIndex >= orderedIndices.length) {
      // All sources exhausted, reset and try again
      setFailedSourceIndices(new Set());
      setIsTryingSources(false);
      return;
    }

    const video = videoRef.current;
    const currentIndex = orderedIndices[currentTryIndex];
    const sources = availableSourcesRef.current;
    
    // Check if video is playing or can play
    if (video && isVideo) {
      // If video has an error or is stalled, mark as failed and try next
      if (video.error || video.readyState < 2) {
        setFailedSourceIndices(prev => new Set(prev).add(currentIndex));
        
        // Try next agent
        const nextTryIndex = currentTryIndex + 1;
        if (nextTryIndex < orderedIndices.length) {
          const nextIndex = orderedIndices[nextTryIndex];
          setCurrentSourceIndex(nextIndex);
          setIsReloading(true);
          setTimeout(() => setIsReloading(false), 1000);
          
          // Verify next source after 5 seconds
          if (sourceVerificationTimeout.current) {
            clearTimeout(sourceVerificationTimeout.current);
          }
          sourceVerificationTimeout.current = setTimeout(() => {
            setIframeErrors(currentErrors => {
              verifyAndTryNext(orderedIndices, nextTryIndex, isVideo, currentErrors);
              return currentErrors;
            });
          }, 5000);
        } else {
          // No more sources, reset and try all again
          setFailedSourceIndices(new Set());
          setIsTryingSources(false);
        }
      } else if (video.readyState >= 3 && (video.currentTime > 0 || video.buffered.length > 0)) {
        // Agent is working - reset failed agents and stop trying
        setFailedSourceIndices(new Set());
        setIsTryingSources(false);
        setStreamError(false);
        if (sourceVerificationTimeout.current) {
          clearTimeout(sourceVerificationTimeout.current);
          sourceVerificationTimeout.current = null;
        }
      } else {
        // Not ready yet, check again in 2 seconds
        if (sourceVerificationTimeout.current) {
          clearTimeout(sourceVerificationTimeout.current);
        }
        sourceVerificationTimeout.current = setTimeout(() => {
          setIframeErrors(currentErrors => {
            verifyAndTryNext(orderedIndices, currentTryIndex, isVideo, currentErrors);
            return currentErrors;
          });
        }, 2000);
      }
    } else {
      // For iframes, we need to wait longer and check for errors
      const iframe = iframeRef.current;
      
      // Check if iframe has errors (use the passed state, not closure)
      if (currentIframeErrors.has(currentIndex)) {
        setFailedSourceIndices(prev => new Set(prev).add(currentIndex));
        
        // Try next agent
        const nextTryIndex = currentTryIndex + 1;
        if (nextTryIndex < orderedIndices.length) {
          const nextIndex = orderedIndices[nextTryIndex];
          setIframeErrors(prev => {
            const next = new Set(prev);
            next.delete(currentIndex); // Clear error for current source
            return next;
          });
          setCurrentSourceIndex(nextIndex);
          setIsReloading(true);
          setTimeout(() => setIsReloading(false), 1000);
          
          // Verify next source after longer wait for iframes (10 seconds)
          if (sourceVerificationTimeout.current) {
            clearTimeout(sourceVerificationTimeout.current);
          }
          sourceVerificationTimeout.current = setTimeout(() => {
            // Get fresh iframeErrors state
            setIframeErrors(currentErrors => {
              verifyAndTryNext(orderedIndices, nextTryIndex, isVideo, currentErrors);
              return currentErrors;
            });
          }, 10000);
        } else {
          // No more sources, reset and try all again
          setFailedSourceIndices(new Set());
          setIsTryingSources(false);
        }
        return;
      }
      
      // For iframes, wait longer (10 seconds) to see if errors occur
      // Check iframeErrors state (which is updated by console error interception)
      if (sourceVerificationTimeout.current) {
        clearTimeout(sourceVerificationTimeout.current);
      }
      
      sourceVerificationTimeout.current = setTimeout(() => {
        // Get fresh iframeErrors state
        setIframeErrors(currentErrors => {
          const hasErrors = currentErrors.has(currentIndex);
          
          if (!hasErrors) {
            setFailedSourceIndices(new Set());
            setIsTryingSources(false);
            setStreamError(false);
            if (sourceVerificationTimeout.current) {
              clearTimeout(sourceVerificationTimeout.current);
              sourceVerificationTimeout.current = null;
            }
            return new Set(); // Clear all iframe errors
          } else {
            // Errors occurred during wait, try next
            verifyAndTryNext(orderedIndices, currentTryIndex, isVideo, currentErrors);
            return currentErrors;
          }
        });
      }, 10000);
    }
  }, []);

  // Try to find a working source by cycling through all available sources
  const tryFindWorkingSource = useCallback(async (startFromCurrent: boolean = false) => {
    const sources = availableSourcesRef.current;
    const currentIdx = currentSourceIndexRef.current;
    const failed = failedSourceIndicesRef.current;
    
    if (sources.length === 0) {
      return;
    }
    
    // If only one source, just reload it
    if (sources.length === 1) {
      setIsReloading(true);
      setStreamError(false);
      setFailedSourceIndices(new Set());
      if (videoRef.current) {
        videoRef.current.load();
      }
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
      setTimeout(() => setIsReloading(false), 1000);
      return;
    }

    setIsTryingSources(true);
    setStreamError(false);
    
    // Get all source indices that haven't failed yet
    const workingIndices = Array.from({ length: sources.length }, (_, i) => i)
      .filter(idx => !failed.has(idx));
    
    // If all sources failed, reset and try all again
    if (workingIndices.length === 0) {
      setFailedSourceIndices(new Set());
      const allIndices = Array.from({ length: sources.length }, (_, i) => i);
      
      // Start from next index after current if startFromCurrent, otherwise start from 0
      const startIndex = startFromCurrent ? ((currentIdx + 1) % sources.length) : 0;
      const reorderedIndices = [
        ...allIndices.slice(startIndex),
        ...allIndices.slice(0, startIndex)
      ];
      
      // Try first source immediately
      setCurrentSourceIndex(reorderedIndices[0]);
      setIsReloading(true);
      
      // Verify this source after 5 seconds
      if (sourceVerificationTimeout.current) {
        clearTimeout(sourceVerificationTimeout.current);
      }
      sourceVerificationTimeout.current = setTimeout(() => {
        verifyAndTryNext(reorderedIndices, 0, isVideoFile, new Set());
      }, 5000);
      
      setTimeout(() => setIsReloading(false), 1000);
      setIsTryingSources(false);
      return;
    }

    // Reorder indices starting from current (or next after current)
    const startIndex = startFromCurrent 
      ? workingIndices.indexOf(currentIdx) 
      : -1;
    
    let orderedIndices: number[];
    if (startIndex >= 0) {
      // Start from next index after current
      orderedIndices = [
        ...workingIndices.slice(startIndex + 1),
        ...workingIndices.slice(0, startIndex + 1)
      ];
    } else {
      // Current index not in working list, start from beginning
      orderedIndices = workingIndices;
    }

    // Try first working agent
    if (orderedIndices.length > 0) {
      setCurrentSourceIndex(orderedIndices[0]);
      setIsReloading(true);
      
      // Verify this source after 5 seconds
      if (sourceVerificationTimeout.current) {
        clearTimeout(sourceVerificationTimeout.current);
      }
      sourceVerificationTimeout.current = setTimeout(() => {
        verifyAndTryNext(orderedIndices, 0, isVideoFile, new Set());
      }, 5000);
    }
    
    setTimeout(() => setIsReloading(false), 1000);
    setIsTryingSources(false);
  }, [isVideoFile, verifyAndTryNext]);

  // Switch to next available source (called by reload button)
  const switchToNextSource = () => {
    tryFindWorkingSource(true); // Start from next source after current
  };

  // Handle stream errors and auto-switch (only for video elements, not iframes)
  useEffect(() => {
    if (!open || !isVideoFile || !videoRef.current || availableSources.length === 0) return;

    const video = videoRef.current;
    let stallCheckTimer: NodeJS.Timeout | null = null;

    const switchSource = () => {
      // Mark current source as failed
      const currentIdx = currentSourceIndexRef.current;
      setFailedSourceIndices(prev => new Set(prev).add(currentIdx));
      // Try to find a working source
      tryFindWorkingSource(false);
    };

    const handleError = () => {
      setStreamError(true);
      // Mark current source as failed and try next after a brief delay
      setTimeout(() => {
        switchSource();
      }, 500);
    };

    const handleStalled = () => {
      const now = Date.now();
      // Only trigger auto-switch if stalled for more than 3 seconds
      if (now - lastStallTime > 3000 && lastStallTime > 0) {
        setLastStallTime(now);
        switchSource();
      } else if (lastStallTime === 0) {
        setLastStallTime(now);
      }
    };

    const handleWaiting = () => {
      const now = Date.now();
      // If waiting/buffering for more than 5 seconds, switch
      if (now - lastStallTime > 5000 && lastStallTime > 0) {
        setLastStallTime(now);
        switchSource();
      } else if (lastStallTime === 0) {
        setLastStallTime(now);
      }
    };

    const handleCanPlay = () => {
      setLastStallTime(0);
      setStreamError(false);
    };

    const handlePlaying = () => {
      setLastStallTime(0);
      setStreamError(false);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);

    // Monitor for extended stalls (if video hasn't progressed in 10 seconds)
    let lastTime = 0;
    let lastCurrentTime = 0;
    stallCheckTimer = setInterval(() => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        const currentTime = video.currentTime;
        const now = Date.now();
        
        if (lastCurrentTime === currentTime && now - lastTime > 10000 && lastTime > 0) {
          // Video hasn't progressed in 10 seconds
          switchSource();
          lastTime = now;
        } else if (lastCurrentTime !== currentTime) {
          lastTime = now;
        }
        lastCurrentTime = currentTime;
      }
    }, 2000);
    stallCheckInterval.current = stallCheckTimer;

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      if (stallCheckTimer) {
        clearInterval(stallCheckTimer);
      }
      if (stallCheckInterval.current) {
        clearInterval(stallCheckInterval.current);
        stallCheckInterval.current = null;
      }
    };
  }, [open, isVideoFile, currentSrc, availableSources, currentSourceIndex, lastStallTime, tryFindWorkingSource]);

  const toggleViewMode = () => {
    if (isAnimating) return; // Prevent double-clicks during animation
    setIsAnimating(true);
    setViewMode(prev => {
      const next = prev === 'normal' ? 'theater' : 'normal';
      // Reset animation state after transition completes
      setTimeout(() => setIsAnimating(false), 500);
      return next;
    });
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isChatOpen) {
          setIsChatOpen(false);
        } else {
          onClose();
        }
      }
      if ((e.key === 't' || e.key === 'T') && open && !isAnimating) {
        toggleViewMode();
      }
      if ((e.key === 'c' || e.key === 'C') && open && (!e.target || ((e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA'))) {
        setIsChatOpen(prev => !prev);
      }
    }
    if (open) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, isAnimating, isChatOpen]);

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
      {/* Blur backdrop - full screen */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xl backdrop-blur-enter transition-opacity duration-300 opacity-100"
        onClick={onClose}
        style={{ zIndex: 998 }}
      />
      
      {/* Slideover container */}
      <div
        ref={slideoverRef}
        className={`absolute bottom-0 z-[999] slideover-enter theater-mode-transition ${
            viewMode === 'theater' 
              ? 'top-0 bg-black rounded-none' 
              : 'top-0 lg:top-[12%] bg-black rounded-none lg:rounded-t-3xl shadow-2xl'
        } inset-x-0`}
        style={{
          // On desktop: adjust when chat is open (mobile chat is inside, so no adjustment needed)
          right: !isMobile && isChatOpen ? 'clamp(320px, 25vw, 400px)' : 0,
          transition: 'right 0.3s ease-out',
        }}
      >
        {/* Header with controls */}
          <div className={`relative z-20 border-b border-white/10 theater-mode-transition ${
          viewMode === 'theater' 
            ? 'bg-black backdrop-blur-md shadow-lg' 
            : 'bg-black backdrop-blur-sm'
        }`}>
          <div className="flex items-center justify-between p-3 lg:p-6">
            <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="p-1.5 lg:p-2 rounded-lg hover:bg-white/10 transition-colors group flex-shrink-0"
                aria-label="Close"
              >
                <svg 
                  className="w-4 h-4 lg:w-5 lg:h-5 text-white/70 group-hover:text-white transition-colors" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-xs sm:text-sm lg:text-lg font-bold text-white truncate">{title}</h2>
                {viewMode === 'normal' && (
                  <div className="hidden lg:flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/50">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">T</kbd> for theater mode</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* View mode toggle and Chat toggle */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              {/* Reload/Change Source Button */}
              <button
                onClick={switchToNextSource}
                disabled={isReloading || isLoadingSources || isTryingSources}
                className={`px-3 py-2 lg:px-3 lg:py-2 rounded-lg font-medium text-xs lg:text-sm transition-all relative group ${
                  isReloading || isLoadingSources || isTryingSources
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30'
                } ${streamError ? 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30' : ''}`}
                aria-label="Reload or switch agents"
                title={
                  isTryingSources
                    ? 'Trying different agents...'
                    : availableSources.length > 1
                    ? `Switch to next agent (${currentSourceIndex + 1}/${availableSources.length})`
                    : 'Reload stream'
                }
              >
                <span className="flex items-center gap-1 lg:gap-1.5">
                  {(isReloading || isTryingSources) ? (
                    <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {isTryingSources ? 'Trying agents...' : isReloading ? 'Switching...' : availableSources.length > 1 ? `Agents ${currentSourceIndex + 1}/${availableSources.length}` : 'Reload'}
                  </span>
                </span>
                {availableSources.length > 1 && currentSourceIndex < availableSources.length && !isTryingSources && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[rgb(var(--brand-yellow))] rounded-full animate-pulse" />
                )}
              </button>

              {/* Chat toggle */}
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`px-3 py-2 lg:px-4 rounded-lg font-medium text-xs lg:text-sm transition-all relative ${
                  isChatOpen
                    ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/30 hover:shadow-[rgb(var(--brand-yellow))]/40'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
                aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
                title="Toggle chat (C)"
              >
                <span className="flex items-center gap-1 lg:gap-2">
                  <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">Chat</span>
                </span>
                {isChatOpen && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              
              {/* View mode toggle - hide on mobile, show on desktop */}
              <button
                onClick={toggleViewMode}
                disabled={isAnimating}
                className={`hidden lg:flex px-4 py-2 rounded-lg font-medium text-sm view-mode-toggle items-center gap-2 ${
                  isAnimating ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  viewMode === 'normal'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/30 hover:shadow-[rgb(var(--brand-yellow))]/40'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
                aria-label={`Switch to ${viewMode === 'normal' ? 'theater' : 'normal'} mode`}
              >
                {viewMode === 'theater' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Normal
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Theater
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content area: Video Player + (Mobile Chat if open) */}
        <div className={`flex flex-col ${viewMode === 'theater' ? 'h-[calc(100vh-70px)] lg:h-[calc(100vh-80px)]' : 'h-[calc(100%-64px)] lg:h-[calc(100%-80px)]'} overflow-hidden`}>
          {/* Player container with smooth transitions */}
          <div 
            className={`relative w-full theater-mode-transition flex-shrink-0 ${
              isAnimating ? 'opacity-60 scale-[0.98]' : 'opacity-100 scale-100'
            } ${
              viewMode === 'theater' 
                ? `${isMobile && isChatOpen ? 'flex-1 max-h-[60vh]' : 'h-full'} px-0` 
                : `aspect-video max-w-full lg:max-w-6xl mx-auto px-2 lg:px-6 ${isMobile && isChatOpen ? 'flex-shrink-0' : ''}`
            }`}
          >
          {/* Gradient overlay for theater mode */}
          {viewMode === 'theater' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none z-10" />
          )}

          {/* Outer frame container with border and gradient */}
          <div className={`w-full h-full overflow-hidden bg-gradient-to-br from-[rgb(var(--bg))] via-[rgb(var(--bg))] via-[rgb(var(--bg))] to-gray-900 relative ${
            viewMode === 'theater' 
              ? 'rounded-none' 
              : 'rounded-xl'
          }`}>
            {/* Beautiful inner glow effect with brand colors */}
            <div className={`absolute inset-[1px] ${
              viewMode === 'theater' ? 'rounded-none' : 'rounded-xl'
            } bg-gradient-to-br from-[rgb(var(--brand-yellow))]/8 via-[rgb(var(--bg))] to-blue-500/8 opacity-70`} />
            
            {/* Inner background with beautiful gradient matching website theme */}
            <div className={`absolute inset-[2px] ${
              viewMode === 'theater' ? 'rounded-none' : 'rounded-xl'
            } bg-gradient-to-br from-[rgb(var(--bg))] via-gray-950 via-[rgb(var(--bg))]/98 to-[rgb(var(--bg))]`}>
              {/* Loading/Error Overlay */}
              {(isReloading || streamError || isTryingSources) && (
                <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-white">
                    {(isReloading || isTryingSources) ? (
                      <>
                        <svg className="w-8 h-8 animate-spin text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm font-medium">
                          {isTryingSources 
                            ? `Trying different agents (${currentSourceIndex + 1}/${availableSources.length})...`
                            : availableSources.length > 1 
                            ? `Switching to next agent...` 
                            : 'Reloading stream...'}
                        </p>
                      </>
                    ) : streamError ? (
                      <>
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm font-medium">Stream error, trying different sources...</p>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Agents Indicator Badge */}
              {availableSources.length > 1 && currentSourceIndex < availableSources.length && !isReloading && !isTryingSources && showAgentBadge && (
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg border border-white/20 transition-opacity duration-300">
                  <span className="text-xs text-white/70 font-medium">
                    {availableSources[currentSourceIndex].source !== 'initial' 
                      ? `Agents: ${getAgentName(availableSources[currentSourceIndex].source, currentSourceIndex)}` 
                      : `Agents ${currentSourceIndex + 1}/${availableSources.length}`}
                  </span>
                </div>
              )}

              {/* Video/Iframe Container */}
              <div className={`absolute inset-[2px] ${
                viewMode === 'theater' ? 'rounded-none' : 'rounded-lg'
              } overflow-hidden`}>
                {isVideoFile ? (
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    src={computedSrc}
                    playsInline
                    key={computedSrc}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe
                    ref={iframeRef}
                    title={title}
                    src={computedSrc}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    className="w-full h-full border-0"
                    key={`${currentSourceIndex}-${computedSrc}`}
                    style={{
                      backgroundColor: 'rgb(var(--bg))'
                    }}
                    onLoad={() => {
                      // Clear any errors on successful load
                      setIframeErrors(prev => {
                        const next = new Set(prev);
                        next.delete(currentSourceIndex);
                        return next;
                      });
                    }}
                    onError={() => {
                      setIframeErrors(prev => new Set(prev).add(currentSourceIndex));
                    }}
                  />
                )}
              </div>

              {/* Corner accent lines - Always visible */}
              <div className={`absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-[rgb(var(--brand-yellow))]/20 ${
                viewMode === 'theater' ? 'rounded-tl-none' : 'rounded-tl-xl'
              } pointer-events-none z-30`} />
              <div className={`absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-[rgb(var(--brand-yellow))]/20 ${
                viewMode === 'theater' ? 'rounded-tr-none' : 'rounded-tr-xl'
              } pointer-events-none z-30`} />
              <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-[rgb(var(--brand-yellow))]/20 ${
                viewMode === 'theater' ? 'rounded-bl-none' : 'rounded-bl-xl'
              } pointer-events-none z-30`} />
              <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-[rgb(var(--brand-yellow))]/20 ${
                viewMode === 'theater' ? 'rounded-br-none' : 'rounded-br-xl'
              } pointer-events-none z-30`} />
            </div>
          </div>
          </div>

          {/* Mobile Chat (rendered below video inside slideover) */}
          {isMobile && matchId && (
            <div className={`w-full border-t border-white/10 transition-all duration-300 overflow-hidden ${
              isChatOpen ? (viewMode === 'theater' ? 'flex-1 min-h-[40vh]' : 'flex-1 min-h-[300px]') : 'h-0 flex-shrink-0'
            }`}>
              <MatchChat
                matchId={matchId}
                matchTitle={title}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen(!isChatOpen)}
                isMobileLayout={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Chat Sidebar (rendered as sibling outside slideover) */}
      {!isMobile && matchId && (
        <MatchChat
          matchId={matchId}
          matchTitle={title}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
          isMobileLayout={false}
        />
      )}
    </div>
  );
}

