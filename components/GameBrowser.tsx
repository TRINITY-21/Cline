"use client";

// favorites and notifications removed
import { getCategoryDisplayName } from '@/lib/streamed';
import type { EnrichedGame } from '@/lib/types';
import { firstNameOf, getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import MatchPlayerSlideover from './MatchPlayerSlideover';
// sharing removed

function TeamLogo({ logo, name, size = 80, className = "" }: { logo?: string; name: string; size?: number; className?: string }) {
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
  
  // If className is provided with responsive classes, use it directly
  if (className && (className.includes('w-') || className.includes('h-') || className.includes('max-w') || className.includes('max-h'))) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        className={`object-contain ${className}`}
        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
        onError={() => setHasError(true)}
      />
    );
  }
  
  let imgClassName = "object-contain rounded-full";
  if (size > 140) {
    imgClassName = "w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-contain rounded-full";
  } else if (size > 110) {
    imgClassName = "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain rounded-full";
  } else if (size > 70) {
    imgClassName = "w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain rounded-full";
  } else if (size > 50) {
    imgClassName = "w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain rounded-full";
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

type Sport = 'Football' | 'Hockey' | 'Volleyball' | 'Basketball' | 'Tennis' | 'NFL' | 'All';

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

const DEFAULT_SRC = 'https://voodc.com/embed/1/85818c92a38e9e86847a8599a08f9887847c.html';

const MOCK_GAMES: GameItem[] = [];

export default function GameBrowser() {
  const [activeSport, setActiveSport] = useState<Sport>('Football');
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [sportDropdownOpen, setSportDropdownOpen] = useState<boolean>(false);
  const sportDropdownRef = useRef<HTMLDivElement>(null);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  // removed favorites and notifications hooks

  // Fetch function for SWR
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };

  // Use SWR for data fetching with caching and revalidation
  const { data: apiData, error, isLoading } = useSWR('/api/trending-streamed', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 60000, // Revalidate every 60 seconds for trending matches
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  });

  // Transform API data
  const fetched = useMemo(() => {
    return Array.isArray(apiData) ? apiData : [];
  }, [apiData]);

  // Extract available category tags from API data for filters
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    fetched.forEach((m: any) => {
      if (m.categoryTag) {
        categorySet.add(m.categoryTag);
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
  }, [fetched]);

  // Build sports array with category-based filtering
  const sports = useMemo(() => {
    const out: string[] = [];
    availableCategories.forEach(categoryTag => {
      const displayName = getCategoryDisplayName(categoryTag);
      if (!out.includes(displayName)) out.push(displayName);
    });
    // Fallback default list without "All Sports"
    return out.length > 0 ? out : ['Football', 'NFL', 'Basketball', 'Hockey', 'Tennis'];
  }, [availableCategories]);
  
  const games = useMemo<EnrichedGame[]>(() => {
    // Filter by category tag when available, fallback to sport
    let source = fetched;
    if (activeSport !== 'All') {
      source = fetched.filter((m: any) => {
        if (m.categoryTag) {
          // Use categoryTag for precise filtering
          const categoryTag = m.categoryTag as string;
          const displayName = getCategoryDisplayName(categoryTag);
          return displayName === activeSport;
        } else {
          // Fallback to sport matching
          return m.sport === activeSport;
        }
      });
    }
    const limited = source.slice(0, activeSport === 'All' ? 12 : 6); // Show more if showing all sports
    
    // Map directly to EnrichedGame[] - use Streamed API data directly
    return limited.map((m: any) => {
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
        status: m.status || 'upcoming',
        categoryTag: m.categoryTag, // Store category tag for filtering (not display)
        matchId: m.id, // Add matchId from API
      };
    });
  }, [activeSport, fetched]);

  // Pick a single featured match: prefer live, otherwise earliest upcoming
  const featured = useMemo(() => {
    if (!Array.isArray(fetched) || fetched.length === 0) return null as any;

    // Filter by current sport tab when not showing All
    let source: any[] = fetched;
    if (activeSport !== 'All') {
      source = fetched.filter((m: any) => {
        if (m?.categoryTag) {
          const displayName = getCategoryDisplayName(String(m.categoryTag));
          return displayName === activeSport;
        }
        return m?.sport === activeSport;
      });
    }
    if (source.length === 0) return null as any;

    const sorted = [...source].sort((a: any, b: any) => {
      const aLive = a.status === 'live' ? 1 : 0;
      const bLive = b.status === 'live' ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive; // live first
      const aStart = a.startTime ? new Date(a.startTime).getTime() : Number.MAX_SAFE_INTEGER;
      const bStart = b.startTime ? new Date(b.startTime).getTime() : Number.MAX_SAFE_INTEGER;
      return aStart - bStart; // earlier first
    });
    return sorted[0];
  }, [fetched, activeSport]);

  // Countdown timer (updates every second)
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function formatCountdown(startIso?: string): { label: string; seconds: number; hours: number; minutes: number; secs: number } {
    if (!startIso) return { label: 'TBD', seconds: 0, hours: 0, minutes: 0, secs: 0 };
    const start = new Date(startIso).getTime();
    const diffMs = start - nowTs;
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    if (seconds <= 0) return { label: 'Live now', seconds: 0, hours: 0, minutes: 0, secs: 0 };
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return { label: `Starts in ${parts.join(' ')}`, seconds, hours: h, minutes: m, secs: s };
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setSportDropdownOpen(false);
      }
    };

    if (sportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sportDropdownOpen]);

  // Live detection: if we have a video source, consider it live

  return (
    <div className="space-y-4 sm:space-y-5 fade-in-up w-full max-w-full box-border">
      {/* We are focusing on a single featured match for Trending */}

      {/* Mobile/Tablet Filters - collapsible */}
      <div className="lg:hidden relative z-[100] w-full max-w-full box-border mb-4">
        <div className={`bg-white/5 border border-white/10 rounded-xl ${sportDropdownOpen ? 'overflow-visible' : 'overflow-hidden'} w-full max-w-full box-border`}>
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
            <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {filtersOpen && (
            <div className="px-4 pb-4 space-y-3 pt-2 relative">
              {/* Sport dropdown */}
              <div className={`relative ${sportDropdownOpen ? 'z-[10000]' : ''}`} data-dropdown>
                <button
                  onClick={() => setSportDropdownOpen(!sportDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                >
                  <span className="text-white text-sm font-medium">{activeSport}</span>
                  <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${sportDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {sportDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9990]"
                      onClick={() => setSportDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto">
                      {sports.map(sport => (
                        <button
                          key={sport}
                          onClick={() => { 
                            setActiveSport(sport as Sport); 
                            setSportDropdownOpen(false); 
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0 ${activeSport === sport ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80'}`}
                        >
                          <span className="font-medium text-sm">{sport}</span>
                          {activeSport === sport && (
                            <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop filters */}
      <div className="hidden lg:block relative w-full">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full max-w-full box-border">
          {sports.slice(0, 8).map(s => (
            <button
              key={s}
              onClick={() => setActiveSport(s as Sport)}
              className={
                "px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg font-medium text-xs lg:text-sm transition-all duration-200 flex-shrink-0 " +
                (s === activeSport
                  ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.08] hover:bg-white/[0.05] hover:text-white hover:border-white/[0.15] backdrop-blur-sm')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-white/80 text-lg font-semibold mb-2">Failed to load trending matches</p>
          <p className="text-white/50">Please try refreshing the page</p>
        </div>
      ) : isLoading ? (
        <div className="skeleton rounded-2xl h-[320px]" />
      ) : (!featured ? true : false) ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">🔥</div>
          <p className="text-white/80 text-lg font-semibold mb-2">No featured match</p>
          <p className="text-white/50">Check back soon for the next big game</p>
        </div>
      ) : (
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
        {/* Background grid + glow */}
        <div className="absolute inset-0 bg-grid-yellow bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

        {/* Center duel */}
        <div className="relative z-10 px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12">
            <div className="text-center min-w-0 flex-1 max-w-[180px] sm:max-w-[220px] md:max-w-[260px]">
              <div className="flex items-center justify-center mb-1.5 sm:mb-2 p-1.5 sm:p-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 flex items-center justify-center overflow-visible">
                  <TeamLogo logo={featured?.home?.logo} name={firstNameOf(featured?.home?.name || '')} size={120} className="max-w-full max-h-full w-auto h-auto" />
                </div>
              </div>
              <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-semibold text-white/90 truncate">{getDisplayName(featured?.home?.name || '')}</div>
            </div>
            <span className="text-white/60 text-base sm:text-lg md:text-xl lg:text-2xl font-medium flex-shrink-0">VS</span>
            <div className="text-center min-w-0 flex-1 max-w-[180px] sm:max-w-[220px] md:max-w-[260px]">
              <div className="flex items-center justify-center mb-1.5 sm:mb-2 p-1.5 sm:p-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 flex items-center justify-center overflow-visible">
                  <TeamLogo logo={featured?.away?.logo} name={firstNameOf(featured?.away?.name || '')} size={120} className="max-w-full max-h-full w-auto h-auto" />
                </div>
              </div>
              <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-semibold text-white/90 truncate">{getDisplayName(featured?.away?.name || '')}</div>
            </div>
          </div>

          {/* Meta and actions */}
          <div className="mt-4 sm:mt-5 md:mt-6 flex flex-col items-center gap-3 sm:gap-4">
            {/* League and Time Info - Combined */}
            <div className="flex items-center gap-3 sm:gap-4">
              {featured?.league?.name && (
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/60 font-medium">
                  {featured.league.name}
                </span>
              )}
              {featured?.timeLabel && (
                <>
                  {featured?.league?.name && <span className="text-white/30">•</span>}
                  <span className="text-xs sm:text-sm font-mono text-white/60">
                    {featured.timeLabel}
                  </span>
                </>
              )}
            </div>
            
            {(() => {
              const info = formatCountdown(featured?.startTime);
              const live = info.seconds === 0 || featured?.status === 'live';
              
              if (live) {
                return null; // Live indicator will be shown with the button
              }
              
              return (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="text-xs md:text-sm uppercase tracking-wider text-white/60 font-medium mb-1">
                    Starts in
                  </div>
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    {info.hours > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="font-mono tabular-nums text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/[0.12] shadow-[0_0_40px_rgba(255,212,0,0.15)]">
                          {String(info.hours).padStart(2, '0')}
                        </div>
                        <div className="text-[10px] sm:text-[10px] md:text-xs uppercase tracking-wider text-white/50 mt-1.5 font-medium">
                          Hours
                        </div>
                      </div>
                    )}
                    {info.hours > 0 && (
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white/40 pb-6 sm:pb-8">:</div>
                    )}
                    <div className="flex flex-col items-center">
                      <div className="font-mono tabular-nums text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/[0.12] shadow-[0_0_40px_rgba(255,212,0,0.15)]">
                        {String(info.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] sm:text-[10px] md:text-xs uppercase tracking-wider text-white/50 mt-1.5 font-medium">
                        Minutes
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white/40 pb-6 sm:pb-8">:</div>
                    <div className="flex flex-col items-center">
                      <div className="font-mono tabular-nums text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/[0.12] shadow-[0_0_40px_rgba(255,212,0,0.15)]">
                        {String(info.secs).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] sm:text-[10px] md:text-xs uppercase tracking-wider text-white/50 mt-1.5 font-medium">
                        Seconds
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const info = formatCountdown(featured?.startTime);
              const live = info.seconds === 0 || featured?.status === 'live';
              return live ? (
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-red-400 uppercase tracking-wide">
                      Live Now
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg bg-[rgb(var(--brand-yellow))] text-black text-sm sm:text-base font-semibold hover:bg-[rgb(var(--brand-yellow))]/90 transition-colors shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/30 flex items-center gap-2"
                    onClick={() =>
                      setSelected({
                        id: Math.random().toString(36).slice(2),
                        sport: (featured?.sport || 'Football') as Sport,
                        league: featured?.league?.name || '',
                        home: featured?.home?.name || '',
                        away: featured?.away?.name || '',
                        time: featured?.timeLabel || '',
                        videoSrc: featured?.videoSrc || '',
                        matchId: featured?.id,
                      })
                    }
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    <span>Watch Live</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-white/60 text-center">Stay tuned — we'll start the stream at kickoff</p>
              );
            })()}
          </div>
        </div>
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


