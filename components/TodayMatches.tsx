"use client";

import { enrichGames } from '@/lib/catalog';
import type { EnrichedGame } from '@/lib/types';
import { extractTimeLabel, firstNameOf, getDisplayName, isTodayFromGmtMinus1, statusFromLiveWindow } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import AvatarFallback from './AvatarFallback';
import PlayerOverlay from './PlayerOverlay';

type Sport = 'Football' | 'Hockey' | 'Volleyball' | 'Basketball' | 'Tennis';

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
    return <AvatarFallback name={name} size={size} />;
  }
  
  let imgClassName = "object-contain rounded-full";
  if (size > 40) {
    // Make logos bigger to fill more of the circular badge (44px fills most of the 48px container)
    imgClassName = "w-[46px] h-[46px] object-contain rounded-full";
  } else if (size > 20) {
    imgClassName = "w-6 h-6 rounded-full object-contain";
  } else {
    imgClassName = "w-4 h-4 rounded-full object-contain";
  }
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      className={imgClassName + " " + className}
      onError={() => setHasError(true)}
    />
  );
}

// time helpers moved to lib/utils

export default function TodayMatches() {
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [activeSport, setActiveSport] = useState<Sport | 'All'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('tm_active_sport');
      if (saved === 'All' || saved === 'Football' || saved === 'Hockey' || saved === 'Volleyball' || saved === 'Basketball' || saved === 'Tennis') {
        return saved as Sport | 'All';
      }
    }
    return 'Football';
  });
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [fetchedGames, setFetchedGames] = useState<EnrichedGame[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tm_active_sport', String(activeSport));
    }
  }, [activeSport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/matches', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        // Map UnifiedMatch[] -> ScrapedGame[] -> EnrichedGame[]
        const mapped = (Array.isArray(data) ? data : []).map((m: any) => ({
          sport: m.sport,
          league: m.league?.name,
          home: m.home?.name,
          away: m.away?.name,
          videoSrc: m.videoSrc || '',
          time: m.timeLabel || '',
          matchId: m.id,
          status: m.status || '',
        }));
        const enriched = enrichGames(mapped);
        // Reattach matchId (not part of enrichGames types prior)
        const withIds = enriched.map((g: any, idx: number) => ({ ...g, matchId: mapped[idx]?.matchId, status: (mapped[idx] as any)?.status }));
        setFetchedGames(withIds);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const sports = useMemo(() => ['All', 'Football', 'Hockey', 'Volleyball', 'Basketball', 'Tennis'] as const, []);
  
  const todayGames = useMemo<EnrichedGame[]>(() => {
    const source = fetchedGames;
    const filtered = source.filter(g => {
      const sportMatch = activeSport === 'All' || g.sport === activeSport;
      if (!sportMatch) return false;
      // show if live (videoSrc) or scheduled for today when converting GMT-1 to local
      return !!g.videoSrc || isTodayFromGmtMinus1(g.time || '');
    });
    return filtered;
  }, [activeSport, fetchedGames]);

  const groupedByTime = useMemo(() => {
    const groups: Record<string, EnrichedGame[]> = {};
    todayGames.forEach(game => {
      const hasVideoSrc = !!game.videoSrc;
      const { time } = extractTimeLabel((game.time || '').trim());
      // If no parseable time, skip grouping (hide "other")
      if (!time) return;
      // Compute derived status strictly from time window, then fall back to server when missing
      const serverStatus = (game as any).status as string | undefined;
      const windowStatus = statusFromLiveWindow(game.time || '', 120);
      const derived = windowStatus;
      const isEnded = derived === 'ended' || serverStatus === 'ended';
      const isActuallyLive = derived === 'live' || (!derived && serverStatus === 'live');

      // Group under 'live' or its HH:MM bucket; no 'other' group
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setActiveSport(s as Sport | 'All')}
            className={"pill " + (s === activeSport ? 'pill-active' : 'pill-muted')}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Sticky jump chips + controls */}
      <div className="sticky-rail -mx-4 px-4 py-2 relative">
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

      {todayGames.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <p>No matches scheduled for today</p>
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
                    <span className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                    <h3 className="text-sm font-bold text-[rgb(var(--brand-yellow))] uppercase tracking-wide">Live Now</h3>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">{timeKey}</h3>
                  </>
                )}
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                <span className="text-xs text-white/50 mr-2">{games.length} {games.length === 1 ? 'match' : 'matches'}</span>
                <span className={"text-xs text-white/70 transition-transform " + (isOpen ? 'rotate-90' : '')}>›</span>
              </button>

              {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {games.map(game => {
                  const status = (game as any).status as string | undefined;
                  const derived = (game as any)._derivedStatus as string | undefined;
                  const effectiveStatus = derived || status;
                  const isLive = effectiveStatus === 'live';
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
                        "text-left group rounded-lg overflow-hidden border border-white/10 bg-white/5 transition-all " +
                        (isClickable ? "hover:bg-white/10 hover:border-white/20 neon-hover" : "opacity-100 cursor-not-allowed pointer-events-none")
                      }
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/50 uppercase tracking-wide">{game.league}</span>
                          <div className="flex items-center gap-2">
                            {/* Show timeLabel directly without GMT conversion */}
                            {game.time && (
                              <span className="text-[10px] text-white/60 font-mono">
                                {game.time}
                              </span>
                            )}
                            {isLive && (
                              <span className="inline-flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Home block */}
                          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="duel-pedestal w-12 h-12 grid place-items-center overflow-hidden shrink-0">
                              <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={48} />
                              <div className="duel-gloss" />
                            </div>
                            <div className="font-semibold text-xs truncate max-w-[7rem] text-center" title={game.home.name}>{getDisplayName(game.home.name)}</div>
                          </div>

                          <span className="text-white/40 text-[10px] font-bold">VS</span>

                          {/* Away block */}
                          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="duel-pedestal w-12 h-12 grid place-items-center overflow-hidden shrink-0">
                              <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={48} />
                              <div className="duel-gloss" />
                            </div>
                            <div className="font-semibold text-xs truncate max-w-[7rem] text-center" title={game.away.name}>{getDisplayName(game.away.name)}</div>
                          </div>
                        </div>
                        
                        <div className="pt-1.5 border-t border-white/10">
                          {(() => {
                            const status = (game as any).status as string | (undefined);
                            const derived = (game as any)._derivedStatus as string | undefined;
                            const effectiveStatus = derived || status;
                            const isLiveBtn = effectiveStatus === 'live';
                            if (isLiveBtn) {
                              return (
                                <span className="btn btn-primary !text-xs !px-3 !py-1 w-full justify-center">Watch Live</span>
                              );
                            }
                            const label = effectiveStatus === 'ended' ? 'Ended' : 'Not started';
                            return (
                              <span className="btn btn-ghost opacity-50 cursor-not-allowed !text-xs !px-3 !py-1 w-full justify-center">
                                {label}
                              </span>
                            );
                          })()}
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

      <PlayerOverlay
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.home} vs ${selected.away} • ${selected.league}` : ''}
        src={selected?.videoSrc || DEFAULT_SRC}
        matchId={selected?.matchId}
      />
    </div>
  );
}

