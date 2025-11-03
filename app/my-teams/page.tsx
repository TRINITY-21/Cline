"use client";

import DefaultTeamLogo from '@/components/DefaultTeamLogo';
import MatchPlayerSlideover from '@/components/MatchPlayerSlideover';
import { useFavorites } from '@/hooks/useFavorites';
import { firstNameOf, getDisplayName } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

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

function TeamLogo({ logo, name, size = 48, className = "" }: { logo?: string; name: string; size?: number; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (!logo || hasError) {
    return <DefaultTeamLogo name={name} size={size} />;
  }
  
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

export default function MyTeamsPage() {
  const { favorites, checkIsFavorite, toggleFavorite } = useFavorites();
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'highlights'>('matches');

  // Fetch matches
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };

  const { data: matchesData } = useSWR('/api/matches-streamed', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
  });

  const { data: highlightsData } = useSWR('/api/highlights', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 300000, // 5 minutes for highlights
  });

  // Get favorite team names for filtering
  const favoriteTeamNames = useMemo(() => {
    return new Set(favorites.map(t => t.name.toLowerCase()));
  }, [favorites]);

  // Filter matches to show only those with favorite teams
  const favoriteMatches = useMemo(() => {
    if (!matchesData || !Array.isArray(matchesData)) return [];
    
    return matchesData
      .map((m: any) => ({
        sport: m.sport,
        league: m.league?.name || '',
        videoSrc: m.videoSrc || '',
        time: m.timeLabel || '',
        home: {
          name: m.home?.name || '',
          logo: m.home?.logo || undefined,
        },
        away: {
          name: m.away?.name || '',
          logo: m.away?.logo || undefined,
        },
        matchId: m.id,
        status: m.status || 'upcoming',
        categoryTag: m.categoryTag,
      }))
      .filter((game: any) => {
        const homeName = game.home.name.toLowerCase();
        const awayName = game.away.name.toLowerCase();
        return favoriteTeamNames.has(homeName) || favoriteTeamNames.has(awayName);
      });
  }, [matchesData, favoriteTeamNames]);

  // Filter highlights
  const favoriteHighlights = useMemo(() => {
    if (!highlightsData?.matches || !Array.isArray(highlightsData.matches)) return [];
    
    return highlightsData.matches.filter((h: any) => {
      const homeName = (h.homeTeam || '').toLowerCase();
      const awayName = (h.awayTeam || '').toLowerCase();
      return favoriteTeamNames.has(homeName) || favoriteTeamNames.has(awayName);
    }).slice(0, 12); // Limit to 12 highlights
  }, [highlightsData, favoriteTeamNames]);

  if (favorites.length === 0) {
    return (
      <div className="container-narrow py-8 sm:py-12">
        <section className="surface p-6 sm:p-8 md:p-10 hero-glow text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-6xl mb-4">⭐</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              <span className="text-[rgb(var(--brand-yellow))]">My Teams</span>
            </h1>
            <p className="text-white/70 text-sm sm:text-base leading-relaxed">
              Follow your favorite teams to see their upcoming matches, live scores, and highlights all in one place.
            </p>
            <div className="pt-4 space-y-3">
              <p className="text-white/60 text-sm">Get started by following teams from:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link href="/" className="pill pill-active text-xs px-4 py-2">
                  🔥 Trending Matches
                </Link>
                <Link href="/" className="pill pill-active text-xs px-4 py-2">
                  📅 Today&apos;s Matches
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container-narrow py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <section className="surface p-5 sm:p-6 md:p-8 hero-glow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">My Teams</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
              <span className="text-[rgb(var(--brand-yellow))]">Followed</span> Teams
            </h1>
            <p className="text-white/70 mt-2 text-sm max-w-prose">
              {favorites.length} {favorites.length === 1 ? 'team' : 'teams'} followed
            </p>
          </div>

          {/* Tab Toggle - Segmented Control */}
          <div className="w-full md:w-auto inline-flex items-center bg-[#2C2C2E] border border-[#48484A] rounded-lg p-0.5 overflow-hidden">
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center ${
                activeTab === 'matches'
                  ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-sm'
                  : 'text-[#AEAEB2] hover:text-white'
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('highlights')}
              className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center ${
                activeTab === 'highlights'
                  ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-sm'
                  : 'text-[#AEAEB2] hover:text-white'
              }`}
            >
              Highlights
            </button>
          </div>
        </div>

        {/* Favorite Teams List */}
        <div className="flex flex-wrap gap-3">
          {favorites.map((team) => (
            <div
              key={team.name}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg group"
            >
              {team.logo ? (
                <img
                  src={team.logo}
                  alt=""
                  className="w-6 h-6 rounded-full object-contain"
                />
              ) : (
                <DefaultTeamLogo name={team.name} size={24} />
              )}
              <span className="text-sm font-medium text-white/90">{team.name}</span>
              <button
                onClick={() => toggleFavorite({ name: team.name, logo: team.logo, sport: team.sport })}
                className="ml-1 p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Unfollow"
              >
                <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <section className="space-y-4">
          {favoriteMatches.length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-white/80 text-lg font-semibold mb-2">No upcoming matches</p>
              <p className="text-white/60">Your followed teams don&apos;t have any matches scheduled right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {favoriteMatches.map((game: any, idx: number) => {
                const isLive = game.status === 'live';
                const isEnded = game.status === 'ended';
                const isScheduled = game.status === 'upcoming' || (!isLive && !isEnded);

                return (
                  <div
                    key={`${game.home.name}-${game.away.name}-${idx}`}
                    className="surface p-4 rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 transition-all group cursor-pointer"
                    onClick={() => {
                      if (isLive) {
                        setSelected({
                          id: game.matchId || Math.random().toString(36).slice(2),
                          sport: game.sport as Sport,
                          league: game.league || '',
                          home: game.home.name,
                          away: game.away.name,
                          time: game.time || '',
                          videoSrc: game.videoSrc,
                          matchId: game.matchId,
                        });
                      }
                    }}
                  >
                    {/* Header */}
                    <div className="mb-3 pb-3 border-b border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-white/70 uppercase">
                          {game.league || game.sport}
                        </span>
                        {isLive && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgb(var(--brand-yellow))]/15 border border-[rgb(var(--brand-yellow))]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                            <span className="text-[9px] font-bold text-[rgb(var(--brand-yellow))]">LIVE</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Teams */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 text-center">
                          <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={32} />
                          <p className="text-[10px] font-semibold text-white mt-1 truncate">
                            {getDisplayName(game.home.name, 20)}
                          </p>
                        </div>
                        <span className="text-[8px] text-white/40">VS</span>
                        <div className="flex-1 min-w-0 text-center">
                          <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={32} />
                          <p className="text-[10px] font-semibold text-white mt-1 truncate">
                            {getDisplayName(game.away.name, 20)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    {isLive ? (
                      <button className="w-full rounded-lg bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] text-black font-bold text-xs px-3 py-2 transition-all hover:shadow-lg">
                        ▶ Watch Live
                      </button>
                    ) : (
                      <div className="w-full rounded-lg bg-white/5 border border-white/10 text-white/60 font-medium text-xs px-3 py-2 text-center">
                        {isEnded ? 'Ended' : game.time || 'Scheduled'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Highlights Tab */}
      {activeTab === 'highlights' && (
        <section className="space-y-4">
          {favoriteHighlights.length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-white/80 text-lg font-semibold mb-2">No highlights yet</p>
              <p className="text-white/60">Highlights for your followed teams will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteHighlights.map((highlight: any, idx: number) => (
                <Link
                  key={`${highlight.id || idx}`}
                  href={`/highlight/${highlight.id || encodeURIComponent(highlight.title || '')}`}
                  className="surface p-4 rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 transition-all group"
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-white/70 uppercase">
                        {highlight.league || highlight.category || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-white">
                        {highlight.homeTeam}
                      </span>
                      <span className="text-[10px] text-white/40">vs</span>
                      <span className="text-xs font-bold text-white">
                        {highlight.awayTeam}
                      </span>
                    </div>
                    {highlight.score && (
                      <div className="text-lg font-black text-[rgb(var(--brand-yellow))]">
                        {highlight.score}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60">
                    <span>📅 {highlight.date}</span>
                    {highlight.time && <span>⏰ {highlight.time}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
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

