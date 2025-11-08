"use client";

// favorites and notifications removed
import { getCategoryDisplayName } from '@/lib/streamed';
import type { EnrichedGame } from '@/lib/types';
import { extractTimeLabel, firstNameOf, getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import MatchPlayerSlideover from './MatchPlayerSlideover';
// sharing removed

type Sport = 'Football' | 'Hockey' | 'Volleyball' | 'Basketball' | 'Tennis' | 'NFL';

type GameItem = {
  id: string;
  sport: Sport;
  league: string;
  home: string;
  away: string;
  time: string;
  thumb?: string;
  videoSrc: string;
  matchId?: string;
};

const DEFAULT_SRC = '';

const MOCK_GAMES: GameItem[] = [];

// Live scores intentionally not shown in Today's Matches cards per request.

function TeamLogo({ logo, name, size = 48, className = "" }: { logo?: string; name: string; size?: number; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (!logo || hasError) {
    // Use default image not available logo when team logo is not available
    return (
      <div className="flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://streamed.pk/api/images/badge/GwZg7AZpYEZgHCAjAJgCzuFgpsCwVgBDQhWYNMATkhQFZgrDh49g773htbKbcAxozAp0kbsSwJ0IWShAx65BgObAwPeOKoTCDVmA1tcEIA.webp"
          alt=""
          className="max-w-full max-h-full w-auto h-auto object-contain opacity-80"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    );
  }
  
  // Calculate logo size to fit within container (leave 4px for padding/border)
  const logoSize = size - 4;
  const logoSizePx = `${logoSize}px`;
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      className={`object-contain rounded-full ${className}`}
      style={{ width: logoSizePx, height: logoSizePx }}
      onError={() => setHasError(true)}
    />
  );
}

// time helpers moved to lib/utils

export default function TodayMatches() {
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [activeSport, setActiveSport] = useState<string>('All');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true); // Mobile/tablet filter panel
  const [sportDropdownOpen, setSportDropdownOpen] = useState<boolean>(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState<boolean>(false);
  const sportDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  // removed favorites and notifications hooks

  // Fetch function for SWR
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };

  // Use SWR for data fetching with caching and revalidation
  const { data: apiData, error, isLoading } = useSWR('/api/matches-streamed', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60000, // Revalidate every 60 seconds for live matches
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tm_active_sport', String(activeSport));
    }
  }, [activeSport]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setSportDropdownOpen(false);
        setTimeDropdownOpen(false);
      }
    };

    if (sportDropdownOpen || timeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sportDropdownOpen, timeDropdownOpen]);

  // Transform API data to EnrichedGame format
  const fetchedGames = useMemo<EnrichedGame[]>(() => {
    if (!apiData || !Array.isArray(apiData)) return [];
    
    // Map UnifiedMatch[] directly to EnrichedGame[] - use API data directly
    return apiData.map((m: any) => {
      // Use Streamed API logos directly (from streamed.pk/api/images/badge/)
      const homeLogo = m.home?.logo || undefined;
      const awayLogo = m.away?.logo || undefined;
      
      return {
        sport: m.sport,
        league: m.league?.name || '',
        videoSrc: m.videoSrc || '',
        time: m.timeLabel || '', // Use API time directly
        home: {
          name: m.home?.name || '',
          logo: homeLogo,
          matchedCatalogId: undefined, // Not using catalog
        },
        away: {
          name: m.away?.name || '',
          logo: awayLogo,
          matchedCatalogId: undefined, // Not using catalog
        },
        matchId: m.id,
        status: m.status || 'upcoming',
        categoryTag: m.categoryTag, // Store category tag for filtering (not display)
        poster: m.poster, // Include poster from API
      };
    });
  }, [apiData]);

  // Extract available category tags from API data for filters
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    fetchedGames.forEach((game: any) => {
      if (game.categoryTag) {
        categorySet.add(game.categoryTag);
      }
    });
    
    // Define priority order for popular sports
    const priorityOrder = [
      'FOOTBALL',
      'AMERICAN-FOOTBALL',
      'BASKETBALL',
      'HOCKEY',
      'TENNIS',
      'BASEBALL',
      'CRICKET',
      'RUGBY',
      'VOLLEYBALL',
      'GOLF',
      'FIGHT',
      'AFL',
      'MOTOR-SPORTS',
      'DARTS',
      'BILLIARDS',
    ];
    
    // Sort categories: priority first, then others alphabetically
    const categories: string[] = [];
    priorityOrder.forEach(cat => {
      if (categorySet.has(cat)) categories.push(cat);
    });
    // Add any other categories not in the priority list
    categorySet.forEach(cat => {
      if (!categories.includes(cat)) categories.push(cat);
    });
    
    return categories;
  }, [fetchedGames]);

  // Build sports array with category-based filtering
  const sports = useMemo(() => {
    const baseSports: (string | 'All')[] = ['All'];
    
    availableCategories.forEach(categoryTag => {
      const displayName = getCategoryDisplayName(categoryTag);
      baseSports.push(displayName);
    });
    
    return baseSports;
  }, [availableCategories]);
  
  const todayGames = useMemo<EnrichedGame[]>(() => {
    const source = fetchedGames;
    
    const filtered = source.filter(g => {
      // Filter by category tag when available, fallback to sport
      let sportMatch = false;
      if (activeSport === 'All') {
        sportMatch = true;
      } else if ((g as any).categoryTag) {
        // Use categoryTag for precise filtering
        const categoryTag = (g as any).categoryTag as string;
        const displayName = getCategoryDisplayName(categoryTag);
        sportMatch = displayName === activeSport;
      } else {
        // Fallback to sport matching
        sportMatch = g.sport === activeSport;
      }
      if (!sportMatch) return false;
      // Show if live (has videoSrc) or has a time (all matches from API are today's matches)
      // No timezone conversion needed - API provides dates for today
      return !!g.videoSrc || !!g.time;
    });
    return filtered;
  }, [activeSport, fetchedGames]);

  const groupedByTime = useMemo(() => {
    const groups: Record<string, EnrichedGame[]> = {};
    todayGames.forEach(game => {
      const { time } = extractTimeLabel((game.time || '').trim());
      // If no parseable time, skip grouping (hide "other")
      if (!time) return;
      // Compute derived status - prioritize server status
      // Never auto-mark as "ended" from time - only server can set that
      const serverStatus = (game as any).status as string | undefined;
      
      // Use API status directly - no timezone conversions or calculations
      // The API provides the correct status based on the actual match time
      let derived: 'live' | 'upcoming' | 'ended';
      if (serverStatus === 'ended') {
        derived = 'ended';
      } else if (serverStatus === 'live') {
        derived = 'live';
      } else {
        // Default to upcoming if no status provided
        derived = serverStatus === 'upcoming' ? 'upcoming' : 'upcoming';
      }
      
      const isEnded = derived === 'ended';
      const isActuallyLive = derived === 'live' && !isEnded;

      // Group under 'live' only if actually live and NOT ended
      // Otherwise group by time (HH:MM bucket)
      const key = isActuallyLive ? 'live' : time;
      if (!groups[key]) groups[key] = [];
      // Attach derived status for rendering
      (game as any)._derivedStatus = isEnded ? 'ended' : (isActuallyLive ? 'live' : 'upcoming');
      groups[key].push(game);
    });
    return groups;
  }, [todayGames]);

  // Build stable list of keys to drive chips and defaults
  const timeKeys = useMemo(() => {
    function toMinutes(key: string): number {
      // Handle raw HH:MM format from JSON (no AM/PM)
      const m = (key || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return Number.POSITIVE_INFINITY;
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      return hh * 60 + mm;
    }
    const keys = Object.keys(groupedByTime);
    return keys.sort((a, b) => {
      if (a === 'live') return -1;
      if (b === 'live') return 1;
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return toMinutes(a) - toMinutes(b);
    });
  }, [groupedByTime]);

  // Refs for smooth scroll to groups
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    // Preserve user toggles; only initialize missing keys.
    setExpandedKeys(prev => {
      const next = { ...prev } as Record<string, boolean>;
      const keys = timeKeys;
      const hasAny = Object.keys(next).length > 0;
      let changed = false;
      
      // Check if mobile/tablet (screen width < 1024px)
      const isMobileTablet = typeof window !== 'undefined' && window.innerWidth < 1024;
      
      // Ensure all current keys exist in state
      for (const key of keys) {
        if (!(key in next)) {
          // On first init
          if (!hasAny) {
            // Mobile/tablet: only open 'live', desktop: open 'live' and first upcoming
            if (key === 'live') {
              next[key] = true;
            } else {
              next[key] = false;
            }
          } else {
            next[key] = false;
          }
          changed = true;
        }
      }
      // If this is first init on desktop, also open the first non-live bucket
      if (!hasAny && !isMobileTablet) {
        const first = keys.find(k => k !== 'live');
        if (first) { next[first] = true; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [timeKeys.join('|')]);

  function toggleKey(key: string, value?: boolean) {
    setExpandedKeys(prev => ({ ...prev, [key]: value ?? !prev[key] }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    timeKeys.forEach(k => next[k] = true);
    setExpandedKeys(next);
  }
  function collapseAll() {
    const next: Record<string, boolean> = {};
    timeKeys.forEach(k => next[k] = false);
    setExpandedKeys(next);
  }

  // Helper to get display name for time key
  const getTimeDisplayName = (key: string) => {
    if (key === 'live') return 'Live Now';
    return key;
  };

  // Get active time filter (first expanded key, or 'live' if available)
  const activeTimeFilter = timeKeys.find(k => expandedKeys[k]) || (timeKeys.includes('live') ? 'live' : timeKeys[0] || 'All Time');

  return (
    <div className="space-y-4 sm:space-y-6 fade-in-up">
      {/* Mobile/Tablet Filter Panel - Collapsible */}
      <div className="lg:hidden relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-visible">
          {/* Filter Header */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors touch-manipulation rounded-t-xl"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-white font-medium text-sm">Filters</span>
            </div>
            <svg 
              className={`w-4 h-4 text-white/60 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filter Content */}
          {filtersOpen && (
            <div className="px-4 pb-4 space-y-3 pt-2 relative">
              {/* Live Toggle Button */}
              {timeKeys.includes('live') && (
                <button
                  onClick={() => { 
                    const el = groupRefs.current['live']; 
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                    toggleKey('live', true); 
                  }}
                  className={
                    "w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 touch-manipulation flex items-center justify-center gap-2 " +
                    (expandedKeys['live'] 
                      ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-md shadow-[rgb(var(--brand-yellow))]/20' 
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white')
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
                  <span>Live Now</span>
                </button>
              )}

              {/* Sport Dropdown */}
              <div className={`relative ${sportDropdownOpen ? 'z-[9999]' : 'z-10'}`} data-dropdown>
                <button
                  onClick={() => {
                    setSportDropdownOpen(!sportDropdownOpen);
                    setTimeDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                >
                  <span className="text-white text-sm font-medium">
                    {activeSport === 'All' ? 'All Sports' : activeSport}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-white/60 transition-transform duration-200 ${sportDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {sportDropdownOpen && (
                  <div 
                    ref={sportDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto"
                  >
                    {sports.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setActiveSport(s);
                          setSportDropdownOpen(false);
                        }}
                        className={
                          "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0 " +
                          (s === activeSport 
                            ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' 
                            : 'text-white/80')
                        }
                      >
                        <span className="font-medium text-sm">{s === 'All' ? 'All Sports' : s}</span>
                        {s === activeSport && (
                          <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Filters Dropdown (Sources) */}
              <div className={`relative ${timeDropdownOpen ? 'z-[9999]' : 'z-10'}`} data-dropdown>
                <button
                  onClick={() => {
                    setTimeDropdownOpen(!timeDropdownOpen);
                    setSportDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                >
                  <span className="text-white text-sm font-medium">
                    {activeTimeFilter === 'live' ? 'Live Now' : activeTimeFilter === 'All Time' ? 'All Sources' : `${activeTimeFilter}`}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-white/60 transition-transform duration-200 ${timeDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {timeDropdownOpen && (
                  <div 
                    ref={timeDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto"
                  >
                    {timeKeys.map(k => (
                      <button
                        key={k}
                        onClick={() => {
                          const el = groupRefs.current[k];
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          toggleKey(k, true);
                          setTimeDropdownOpen(false);
                        }}
                        className={
                          "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0 " +
                          (expandedKeys[k] 
                            ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' 
                            : 'text-white/80')
                        }
                      >
                        <span className="font-medium text-sm">{getTimeDisplayName(k)}</span>
                        {expandedKeys[k] && (
                          <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Filters - Keep original design */}
      {/* Sport Filters - Desktop only */}
      <div className="hidden lg:block relative w-full">
        {/* Scrollable container */}
        <div className="w-full overflow-x-auto pb-2 scroll-x-only no-scrollbar touch-pan-x">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {sports.length > 0 ? (
              sports.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSport(s)}
                  className={
                    "px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[11px] sm:text-xs md:text-sm transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px] whitespace-nowrap flex-shrink-0 " + 
                    (s === activeSport 
                      ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20' 
                      : 'bg-white/[0.02] text-white/70 border border-white/[0.08] hover:bg-white/[0.05] hover:text-white hover:border-white/[0.15] backdrop-blur-sm')
                  }
                >
                  {s}
                </button>
              ))
            ) : (
              <button
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[11px] sm:text-xs md:text-sm bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20 touch-manipulation min-h-[36px] sm:min-h-[40px] whitespace-nowrap flex-shrink-0"
                disabled
              >
                All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky jump chips + controls - Desktop only, Full dark background */}
      <div className="hidden lg:block sticky-rail -mx-2 sm:-mx-3 md:-mx-4 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 relative bg-[rgb(var(--bg))]">
        <div className="fade-left"></div>
        <div className="fade-right"></div>
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          {/* Left fixed: Live chip when present */}
          {timeKeys.includes('live') && (
            <button
              onClick={() => { const el = groupRefs.current['live']; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toggleKey('live', true); }}
              className={
                "px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-[11px] md:text-xs whitespace-nowrap touch-manipulation transition-all duration-200 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] flex items-center flex-shrink-0 " +
                (expandedKeys['live'] 
                  ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-md shadow-[rgb(var(--brand-yellow))]/20' 
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white')
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block mr-1 sm:mr-1.5 animate-pulse flex-shrink-0" />
              <span className="hidden sm:inline">Live Now</span>
              <span className="sm:hidden">Live</span>
            </button>
          )}

          {/* Middle: horizontally scrollable time chips (excluding live) */}
          <div className="flex-1 overflow-x-auto scroll-x-only no-scrollbar min-w-0 touch-pan-x relative">
            {/* Fade gradients for scrollable area */}
            <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 pointer-events-none z-10 bg-gradient-to-r from-[rgb(var(--bg))] to-transparent"></div>
            <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-8 pointer-events-none z-10 bg-gradient-to-l from-[rgb(var(--bg))] to-transparent"></div>
            
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 w-max px-0.5">
              {timeKeys.filter(k => k !== 'live').map(k => (
                <button
                  key={k}
                  onClick={() => { const el = groupRefs.current[k]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toggleKey(k, true); }}
                  className={
                    "px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg font-medium text-[10px] sm:text-[11px] md:text-xs whitespace-nowrap touch-manipulation transition-all duration-200 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] flex items-center flex-shrink-0 " +
                    (expandedKeys[k] 
                      ? 'bg-white/10 text-white border border-white/20' 
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80')
                  }
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Right fixed: controls - Icon only on mobile/tablet, with text on desktop */}
          <div className="ml-1 sm:ml-2 flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button 
              className="px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-[10px] sm:text-[11px] md:text-xs font-medium touch-manipulation transition-all duration-200 inline-flex items-center gap-1 sm:gap-1.5 min-h-[36px] sm:min-h-[38px] md:min-h-[40px]"
              onClick={expandAll}
              title="Expand all"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span className="hidden lg:inline">Expand</span>
            </button>
            <button 
              className="px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white text-[10px] sm:text-[11px] md:text-xs font-medium touch-manipulation transition-all duration-200 inline-flex items-center gap-1 sm:gap-1.5 min-h-[36px] sm:min-h-[38px] md:min-h-[40px]"
              onClick={collapseAll}
              title="Collapse all"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              <span className="hidden lg:inline">Collapse</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-white/80 text-lg font-semibold mb-2">Failed to load matches</p>
          <p className="text-white/50">Please try refreshing the page</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton rounded-lg h-48" />
          ))}
        </div>
      ) : todayGames.length === 0 ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">⚽</div>
          <p className="text-white/80 text-lg font-semibold mb-2">No matches scheduled</p>
          <p className="text-white/50">Check back later for upcoming matches</p>
        </div>
      ) : (
        <div className="space-y-6">
          {timeKeys.map((timeKey) => {
            const games = groupedByTime[timeKey] || [];
            const isOpen = !!expandedKeys[timeKey];
            return (
            <div key={timeKey} className="space-y-3" ref={el => { groupRefs.current[timeKey] = el; }}>
              <button 
                onClick={() => toggleKey(timeKey)} 
                className="w-full flex items-center gap-2 sm:gap-3 group hover:bg-white/5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                {timeKey === 'live' ? (
                  <>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse shadow-sm shadow-[rgb(var(--brand-yellow))]/50" />
                      <h3 className="text-xs sm:text-sm font-semibold text-white">Live Now</h3>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="w-2 h-2 rounded-full bg-white/30" />
                      <h3 className="text-xs sm:text-sm font-semibold text-white">{timeKey}</h3>
                    </div>
                  </>
                )}
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                <span className="text-[10px] sm:text-xs text-white/50 font-medium">{games.length} {games.length === 1 ? 'match' : 'matches'}</span>
                <svg 
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 lg:gap-5">
                {games.map((game, gameIdx) => {
                  const status = (game as any).status as string | undefined;
                  const derived = (game as any)._derivedStatus as string | undefined;
                  const effectiveStatus = derived || status;
                  const isLive = effectiveStatus === 'live';
                  const isEnded = effectiveStatus === 'ended';
                  const isScheduled = effectiveStatus === 'upcoming' || (!isLive && !isEnded);
                  const isClickable = isLive;
                  const Wrapper: any = isClickable ? 'button' : 'div';
                  const poster = game.poster;
                  
                  const wrapperProps = isClickable
                    ? {
                        onClick: () =>
                          setSelected({
                            id: Math.random().toString(36).slice(2),
                            sport: game.sport as Sport,
                            league: game.league || '',
                            home: game.home.name,
                            away: game.away.name,
                            time: game.time || '',
                            videoSrc: game.videoSrc,
                            matchId: (game as any).matchId,
                          })
                      }
                    : {};
                  
                  // Get league display name
                  const categoryTag = (game as any).categoryTag as string | undefined;
                  let displayLeague = game.league || '';
                  if (categoryTag) {
                    displayLeague = getCategoryDisplayName(categoryTag);
                  } else {
                    const leagueUpper = (game.league || '').toUpperCase();
                    if (leagueUpper === 'AMERICAN-FOOTBALL' || leagueUpper.includes('AMERICAN FOOTBALL')) {
                      displayLeague = 'NFL';
                    }
                  }
                  
                  return (
                    <Wrapper
                      key={(game.home.matchedCatalogId || game.home.name) + '-' + (game.away.matchedCatalogId || game.away.name) + '-' + game.time}
                      {...wrapperProps}
                      title={`${game.home.name} vs ${game.away.name}`}
                      className={
                        "match-card match-grid-item group relative bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-xl overflow-hidden transition-all duration-300 w-full min-w-0 " +
                        (isLive 
                          ? "shadow-xl shadow-[rgb(var(--brand-yellow))]/10 border-[rgb(var(--brand-yellow))]/30" 
                          : isEnded
                          ? "opacity-60 border-white/[0.08]"
                          : isScheduled
                          ? "border-white/[0.08] hover:border-white/[0.15]"
                          : "border-white/[0.08]") +
                        (isClickable 
                          ? "hover:bg-white/[0.04] hover:border-[rgb(var(--brand-yellow))]/40 hover:shadow-2xl hover:shadow-[rgb(var(--brand-yellow))]/15 cursor-pointer active:scale-[0.98]" 
                          : "cursor-default")
                      }
                      style={{ animationDelay: `${gameIdx * 0.05}s` }}
                    >
                      {/* Header Section */}
                      <div className="px-2.5 sm:px-4 pt-2.5 sm:pt-4 pb-2 sm:pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center justify-between mb-2.5 sm:mb-3 gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            {displayLeague && (
                              <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                                {displayLeague}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 relative z-0 flex-shrink-0 ml-auto">
                            {game.time && (
                              <span className="text-[10px] font-medium text-white/60 font-mono">
                                {game.time}
                              </span>
                            )}
                            {isLive && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[rgb(var(--brand-yellow))]/15 border border-[rgb(var(--brand-yellow))]/30 flex-shrink-0">
                                <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                                <span className="text-[8px] font-bold text-[rgb(var(--brand-yellow))] uppercase tracking-wide">
                                  Live
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Teams Section */}
                        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                          {/* Home Team */}
                          <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 sm:gap-2">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-white/[0.03] border border-white/[0.08] p-1.5 flex items-center justify-center flex-shrink-0">
                              <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={44} />
                            </div>
                            <p className="text-[10px] sm:text-[11px] font-semibold text-white leading-tight line-clamp-2 w-full text-center min-h-[1.5rem] sm:min-h-[1.75rem]">
                              {getDisplayName(game.home.name, 25)}
                            </p>
                          </div>
                          
                          {/* VS Divider */}
                          <div className="flex-shrink-0">
                            <span className="text-[8px] sm:text-[9px] font-medium text-white/40">VS</span>
                          </div>
                          
                          {/* Away Team */}
                          <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 sm:gap-2">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-white/[0.03] border border-white/[0.08] p-1.5 flex items-center justify-center flex-shrink-0">
                              <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={44} />
                            </div>
                            <p className="text-[10px] sm:text-[11px] font-semibold text-white leading-tight line-clamp-2 w-full text-center min-h-[1.5rem] sm:min-h-[1.75rem]">
                              {getDisplayName(game.away.name, 25)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Section */}
                      <div className="px-2.5 sm:px-4 py-2 sm:py-3.5">
                          {isLive ? (
                            <button
                            className="w-full rounded-lg bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] text-black font-bold text-xs px-3 sm:px-4 py-2 transition-all duration-200 hover:from-[#FFE066] hover:to-[rgb(var(--brand-yellow))] hover:shadow-lg hover:shadow-[rgb(var(--brand-yellow))]/30 active:scale-[0.98] flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected({
                                  id: (game as any).matchId || Math.random().toString(36).slice(2),
                                  sport: game.sport as Sport,
                                  league: game.league || '',
                                  home: game.home.name,
                                  away: game.away.name,
                                  time: game.time || '',
                                  videoSrc: game.videoSrc,
                                  matchId: (game as any).matchId,
                                });
                              }}
                            >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                            <span>Watch Live</span>
                            </button>
                        ) : isEnded ? (
                          <div className="w-full rounded-lg bg-white/[0.02] border border-white/[0.08] text-white/50 font-medium text-xs px-3 sm:px-4 py-2 text-center flex items-center justify-center gap-1.5 min-h-[44px]">
                            <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Match Ended</span>
                          </div>
                        ) : isScheduled ? (
                          <div className="w-full rounded-lg bg-white/[0.02] border border-white/[0.08] text-white/70 font-medium text-xs px-3 sm:px-4 py-2 text-center flex items-center justify-center gap-1.5 min-h-[44px]">
                            <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Scheduled</span>
                          </div>
                          ) : null}
                      </div>
                    </Wrapper>
                  );
                })}
              </div>
              )}
            </div>
          );})}
        </div>
      )}

      <MatchPlayerSlideover
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.home} vs ${selected.away} • ${selected.league}` : ''}
        src={selected?.videoSrc || DEFAULT_SRC}
        matchId={selected?.matchId}
      />
    </div>
  );
}


