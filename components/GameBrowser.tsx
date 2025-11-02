"use client";

import { getCategoryDisplayName } from '@/lib/streamed';
import type { EnrichedGame } from '@/lib/types';
import { firstNameOf, getDisplayName } from '@/lib/utils';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import AvatarFallback from './AvatarFallback';
import MatchPlayerSlideover from './MatchPlayerSlideover';

function TeamLogo({ logo, name, size = 80, className = "" }: { logo?: string; name: string; size?: number; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (!logo || hasError) {
    return <AvatarFallback name={name} size={size} />;
  }
  
  let imgClassName = "object-contain rounded-full";
  if (size > 70) {
    imgClassName = "w-16 h-16 md:w-20 md:h-20 object-contain rounded-full";
  } else if (size > 50) {
    imgClassName = "w-12 h-12 md:w-16 md:h-16 object-contain rounded-full";
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
  const [activeSport, setActiveSport] = useState<Sport>('All');
  const [selected, setSelected] = useState<GameItem | null>(null);

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
    const baseSports: string[] = [];
    
    availableCategories.forEach(categoryTag => {
      const displayName = getCategoryDisplayName(categoryTag);
      baseSports.push(displayName);
    });
    
    return baseSports.length > 0 ? baseSports : ['Football', 'Hockey', 'Basketball', 'Tennis'];
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

  // Live detection: if we have a video source, consider it live

  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSport('All')}
          className={
            "pill sport-filter " + 
            ('All' === activeSport ? 'pill-active active' : 'pill-muted')
          }
        >
          All Sports
        </button>
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setActiveSport(s as Sport)}
            className={
              "pill sport-filter " + 
              (s === activeSport ? 'pill-active active' : 'pill-muted')
            }
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-white/80 text-lg font-semibold mb-2">Failed to load trending matches</p>
          <p className="text-white/50">Please try refreshing the page</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(activeSport === 'All' ? 12 : 6)].map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-64" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="empty-state text-center py-16 px-8 rounded-xl">
          <div className="text-6xl mb-4">🔥</div>
          <p className="text-white/80 text-lg font-semibold mb-2">No trending matches</p>
          <p className="text-white/50">Check back soon for popular matches</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((game, i) => {
          const gameSport = game.sport as Sport;
          // Use status from API directly, or fallback to checking if videoSrc exists
          const apiStatus = (game as any).status as string | undefined;
          const isLive = (apiStatus === 'live' || (apiStatus !== 'ended' && !!game.videoSrc));
          const isClickable = isLive;
          const disabledLabel = apiStatus === 'ended' ? 'Ended' : 'Not started';
          return (
          <div
            key={`${gameSport}-${i}-${game.home.name}-${game.away.name}`}
            title={`${game.home.name} vs ${game.away.name}`}
            className={
              "match-card match-grid-item text-left group rounded-xl overflow-hidden border transition-all " +
              (isLive 
                ? "live border-white/20 bg-gradient-to-br from-white/5 to-white/[0.02]" 
                : "border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01]") +
              (isClickable 
                ? "hover:bg-white/10 hover:border-white/20 neon-hover cursor-pointer" 
                : "cursor-not-allowed pointer-events-none")
            }
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="relative aspect-video bg-grid-yellow bg-[size:24px_24px]">
              {/* Duel background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,212,0,0.06)] via-transparent to-transparent" />
              {/* Big team logos duel */}
              <div className="absolute inset-0 flex items-center justify-center mt-12">
                <div className="duel-wrap relative flex items-center gap-6 md:gap-10">
                  <div className="duel-pedestal w-20 h-20 md:w-32 md:h-32 grid place-items-center overflow-hidden">
                    <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={80} />
                    <div className="duel-gloss" />
                  </div>
                  <span className="text-white/60 text-xs md:text-sm tracking-[0.35em] font-extrabold">VS</span>
                  <div className="duel-pedestal w-20 h-20 md:w-32 md:h-32 grid place-items-center overflow-hidden">
                    <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={80} />
                    <div className="duel-gloss" />
                  </div>
                </div>
              </div>
              
              <div className="absolute left-2 top-2 flex items-center gap-2">
                {game.time && (
                  <span className="pill pill-active text-[10px] px-2 py-0.5">{game.time}</span>
                )}
                {isLive && (
                  <span className="live-indicator w-2.5 h-2.5 rounded-full bg-[rgb(var(--brand-yellow))]" />
                )}
                {!game.time && !isLive && (
                  <span className="pill pill-muted text-[10px] px-2 py-0.5 opacity-50">TBD</span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Team Names - Separate pill buttons */}
              <div className="flex items-center justify-center gap-1.5 min-w-0 w-full">
                <div className="flex-1 min-w-0 inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold border border-[rgb(var(--brand-yellow))]/40 bg-gradient-to-br from-[rgb(var(--brand-yellow))]/15 via-[rgb(var(--brand-yellow))]/10 to-[rgb(var(--brand-yellow))]/5 text-[rgb(255,244,180)] whitespace-nowrap overflow-hidden text-ellipsis" title={game.home.name}>
                  <span className="truncate">{getDisplayName(game.home.name)}</span>
                </div>
                <span className="text-[rgb(var(--brand-yellow))]/60 text-xs font-medium flex-shrink-0 px-0.5">vs</span>
                <div className="flex-1 min-w-0 inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold border border-[rgb(var(--brand-yellow))]/40 bg-gradient-to-br from-[rgb(var(--brand-yellow))]/15 via-[rgb(var(--brand-yellow))]/10 to-[rgb(var(--brand-yellow))]/5 text-[rgb(255,244,180)] whitespace-nowrap overflow-hidden text-ellipsis" title={game.away.name}>
                  <span className="truncate">{getDisplayName(game.away.name)}</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5">
                {isLive ? (
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 text-xs font-bold shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/30 transition-all flex items-center justify-center gap-1.5"
                    onClick={() =>
                      setSelected({
                        id: Math.random().toString(36).slice(2),
                        sport: gameSport,
                        league: game.league || '',
                        home: game.home.name,
                        away: game.away.name,
                        time: game.time || '',
                        videoSrc: game.videoSrc,
                        matchId: (game as any).matchId
                      })
                    }
                  >
                    ▶ Watch Live
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    {apiStatus === 'upcoming' || (apiStatus !== 'ended' && apiStatus !== 'live') ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Scheduled</span>
                      </div>
                    ) : null}
                    <span className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      apiStatus === 'ended'
                        ? 'bg-white/5 text-white/50 border border-white/10'
                        : 'bg-gradient-to-r from-white/8 to-white/5 text-white/70 border border-white/10 backdrop-blur-sm'
                    }`}>
                      {disabledLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
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


