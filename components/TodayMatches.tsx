"use client";

import { getCategoryDisplayName } from '@/lib/streamed';
import type { EnrichedGame } from '@/lib/types';
import { extractTimeLabel, firstNameOf, getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import DefaultTeamLogo from './DefaultTeamLogo';
import MatchPlayerSlideover from './MatchPlayerSlideover';

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
    return <DefaultTeamLogo name={name} size={size} />;
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
      // Ensure all current keys exist in state
      for (const key of keys) {
        if (!(key in next)) {
          // On first init, open 'live' and the first upcoming; otherwise default closed
          if (!hasAny) {
            if (key === 'live') next[key] = true; else next[key] = false;
          } else {
            next[key] = false;
          }
          changed = true;
        }
      }
      // If this is first init, also open the first non-live bucket
      if (!hasAny) {
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

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-wrap items-center gap-2">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setActiveSport(s)}
            className={
              "pill sport-filter " + 
              (s === activeSport ? 'pill-active active' : 'pill-muted')
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Sticky jump chips + controls - Full dark background */}
      <div className="sticky-rail -mx-4 px-4 py-2 relative bg-[rgb(var(--bg))]">
        <div className="fade-left"></div>
        <div className="fade-right"></div>
        <div className="flex items-center gap-2">
          {/* Left fixed: Live chip when present */}
          {timeKeys.includes('live') && (
            <button
              onClick={() => { const el = groupRefs.current['live']; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toggleKey('live', true); }}
              className={"pill " + (expandedKeys['live'] ? 'pill-active' : 'pill-muted')}
            >
              Live Now
            </button>
          )}

          {/* Middle: horizontally scrollable time chips (excluding live) */}
          <div className="flex-1 scroll-x-only no-scrollbar">
            <div className="flex items-center gap-2 w-max">
              {timeKeys.filter(k => k !== 'live').map(k => (
                <button
                  key={k}
                  onClick={() => { const el = groupRefs.current[k]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toggleKey(k, true); }}
                  className={"pill " + (expandedKeys[k] ? 'pill-active' : 'pill-muted')}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Right fixed: controls */}
          <div className="ml-2 flex items-center gap-2">
            <button className="pill pill-muted" onClick={expandAll}>Expand all</button>
            <button className="pill pill-muted" onClick={collapseAll}>Collapse all</button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
              <button onClick={() => toggleKey(timeKey)} className="w-full flex items-center gap-3 group">
                {timeKey === 'live' ? (
                  <>
                    <span className="live-indicator w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))]" />
                    <h3 className="text-xs font-medium text-white uppercase tracking-wide">Live Now</h3>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))]" />
                    <h3 className="text-xs font-medium text-white uppercase tracking-wide">{timeKey}</h3>
                  </>
                )}
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                <span className="text-[10px] text-white/50 font-light mr-2">{games.length} matches</span>
                <span className={"text-xs text-white/70 transition-transform " + (isOpen ? 'rotate-90' : '')}>›</span>
              </button>

              {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {games.map((game, gameIdx) => {
                  const status = (game as any).status as string | undefined;
                  const derived = (game as any)._derivedStatus as string | undefined;
                  const effectiveStatus = derived || status;
                  const isLive = effectiveStatus === 'live';
                  const isEnded = effectiveStatus === 'ended';
                  const isScheduled = effectiveStatus === 'upcoming' || (!isLive && !isEnded);
                  const isClickable = isLive;
                  const Wrapper: any = isClickable ? 'button' : 'div';
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
                  return (
                    <Wrapper
                      key={(game.home.matchedCatalogId || game.home.name) + '-' + (game.away.matchedCatalogId || game.away.name) + '-' + game.time}
                      {...wrapperProps}
                      title={`${game.home.name} vs ${game.away.name}`}
                      className={
                        "match-card match-grid-item group rounded-lg overflow-hidden border transition-all duration-300 relative " +
                        (isLive 
                          ? "live border-[rgb(var(--brand-yellow))]/30 bg-[rgb(20,20,25)]" 
                          : isEnded
                          ? "border-white/10 bg-[rgb(20,20,25)]"
                          : isScheduled
                          ? "border-[rgb(var(--brand-yellow))]/20 bg-[rgb(20,20,25)]"
                          : "border-white/10 bg-[rgb(20,20,25)]") +
                        (isClickable 
                          ? "hover:border-[rgb(var(--brand-yellow))]/50 cursor-pointer" 
                          : "cursor-default")
                      }
                      style={{ animationDelay: `${gameIdx * 0.05}s` }}
                    >
                      <div className="relative p-2.5">
                        {/* Header: League name and Time on same row */}
                        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                          {/* League name - Left */}
                          {game.league && (() => {
                            // Use categoryTag if available, otherwise check league name
                            const categoryTag = (game as any).categoryTag as string | undefined;
                            let displayLeague = game.league;
                            
                            if (categoryTag) {
                              // Use getCategoryDisplayName to convert AMERICAN-FOOTBALL to NFL
                              displayLeague = getCategoryDisplayName(categoryTag);
                            } else {
                              // Fallback: check if league contains American Football and convert
                              const leagueUpper = game.league.toUpperCase();
                              if (leagueUpper === 'AMERICAN-FOOTBALL' || leagueUpper.includes('AMERICAN FOOTBALL')) {
                                displayLeague = 'NFL';
                              }
                            }
                            
                            return (
                              <span className="text-[9px] font-light text-white/60 uppercase tracking-wide">
                                {displayLeague.toUpperCase()}
                              </span>
                            );
                          })()}
                          
                          {/* Match time - Right */}
                          <div className="flex items-center gap-1.5">
                            {game.time && (
                              <span className="text-[9px] font-light text-white/60">
                                {game.time}
                              </span>
                            )}
                            {isLive && (
                              <span className="live-indicator w-1.5 h-1.5 rounded-full bg-[rgb(var(--brand-yellow))]" />
                            )}
                          </div>
                        </div>
                        
                        {/* Teams Section - Horizontal Layout with Perfect Alignment */}
                        <div className="pt-5 pb-0.5">
                          {/* Team A Row: Logo + Name - Consistent structure */}
                          <div className="flex items-center mb-1" style={{ gap: '8px' }}>
                            {/* Logo - Fixed width */}
                            <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                              <div className="w-full h-full rounded-full border-2 border-[rgb(var(--brand-yellow))] p-0.5 flex items-center justify-center bg-[rgb(20,20,25)]">
                                <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={34} />
                              </div>
                            </div>
                            {/* Name - Vertically aligned with Team B */}
                            <div className="flex-1 min-w-0" style={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                              <p className="text-[10px] font-light text-white leading-tight line-clamp-2 break-words" title={game.home.name} style={{ lineHeight: '1.3', margin: 0 }}>
                                {getDisplayName(game.home.name)}
                              </p>
                            </div>
                          </div>

                          {/* VS Text - Perfectly Centered */}
                          <div className="flex items-center justify-center py-0.5">
                            <span className="text-[9px] font-light text-white/50 uppercase tracking-wider">VS</span>
                          </div>

                          {/* Team B Row: Logo + Name - Same structure for perfect vertical alignment */}
                          <div className="flex items-center mb-1" style={{ gap: '8px' }}>
                            {/* Logo - Fixed width (same as Team A) */}
                            <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                              <div className="w-full h-full rounded-full border-2 border-[rgb(var(--brand-yellow))] p-0.5 flex items-center justify-center bg-[rgb(20,20,25)]">
                                <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={34} />
                              </div>
                            </div>
                            {/* Name - Vertically aligned with Team A (same left position) */}
                            <div className="flex-1 min-w-0" style={{ minHeight: '20px', display: 'flex', alignItems: 'center' }}>
                              <p className="text-[10px] font-light text-white leading-tight line-clamp-2 break-words" title={game.away.name} style={{ lineHeight: '1.3', margin: 0 }}>
                                {getDisplayName(game.away.name)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button Section - Centered */}
                        <div className="pt-1.5">
                          {isLive ? (
                            <button
                              className="w-full rounded-lg bg-[rgb(var(--brand-yellow))] text-[rgb(20,20,25)] font-medium text-[10px] px-3 py-1.5 transition-all duration-300 hover:opacity-90 shadow-sm"
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
                              Watch Live
                            </button>
                          ) : isEnded ? (
                            <div className="w-full rounded-lg bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 text-white/45 font-medium text-[10px] px-3 py-1.5 text-center flex items-center justify-center gap-1.5 backdrop-blur-sm">
                              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Ended</span>
                            </div>
                          ) : isScheduled ? (
                            <div className="w-full rounded-lg bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/15 text-white/65 font-medium text-[10px] px-3 py-1.5 text-center flex items-center justify-center gap-1.5 backdrop-blur-sm">
                              <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Scheduled</span>
                            </div>
                          ) : null}
                        </div>
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


