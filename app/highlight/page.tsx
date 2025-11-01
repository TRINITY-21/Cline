"use client";

import { useEffect, useMemo, useState } from 'react';
import { type HighlightMatch } from './data';

export default function HighlightsPage() {
  const [matches, setMatches] = useState<HighlightMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMatch, setSelectedMatch] = useState<HighlightMatch | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);

  // Fetch matches from API
  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch('/api/highlights');
        const data = await response.json();
        if (data.matches) {
          setMatches(data.matches);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const leagues = useMemo(() => {
    const leagueSet = new Set(matches.map(m => m.league || m.category).filter(Boolean));
    return Array.from(leagueSet).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const searchLower = (searchQuery || '').trim().toLowerCase();
    const leagueFilter = (selectedLeague || '').trim().toLowerCase();
    
    return matches.filter(match => {
      // League filtering first
      let matchesLeague = true;
      if (leagueFilter && leagueFilter !== 'all') {
        const matchLeague = (match.league || match.category || '').trim().toLowerCase();
        matchesLeague = matchLeague === leagueFilter;
      }
      
      // If no search query, just return league filter result
      if (!searchLower) {
        return matchesLeague;
      }
      
      // Search matching - combine all searchable fields into one string
      const searchableText = [
        match.title || '',
        match.homeTeam || '',
        match.awayTeam || '',
        match.league || '',
        match.category || '',
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchableText.includes(searchLower);
      
      return matchesSearch && matchesLeague;
    });
  }, [matches, searchQuery, selectedLeague]);

  const displayedMatches = useMemo(() => {
    return filteredMatches.slice(0, displayCount);
  }, [filteredMatches, displayCount]);

  const hasMore = filteredMatches.length > displayCount;

  // Reset display count when search or filter changes
  useEffect(() => {
    setDisplayCount(12);
  }, [searchQuery, selectedLeague]);


  return (
    <div className="space-y-6">
      {/* Floating Header - League Filters */}
      {isScrolled && (
        <div className="fixed top-[68px] left-0 right-0 z-50 px-4 py-3 bg-[rgb(var(--bg))]/95 backdrop-blur-xl border-b border-white/10 shadow-xl">
          <div className="container-narrow">
            <div className="flex gap-2 overflow-x-auto scroll-x-only no-scrollbar">
              <button
                onClick={() => {
                  setSelectedLeague('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`pill whitespace-nowrap ${
                  selectedLeague === 'all' 
                    ? 'pill-active' 
                    : 'pill-muted hover:bg-white/10'
                }`}
              >
                All Leagues
              </button>
              {leagues.map(league => (
                <button
                  key={league}
                  onClick={() => {
                    setSelectedLeague(league || 'all');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`pill whitespace-nowrap ${
                    selectedLeague === league
                      ? 'pill-active'
                      : 'pill-muted hover:bg-white/10'
                  }`}
                >
                  {league}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <section className="surface p-5 md:p-6 hero-glow relative overflow-hidden group">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        
        <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Football Highlights</div>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">
              Match <span className="text-[rgb(var(--brand-yellow))]">Highlights</span>
            </h2>
            <p className="text-white/70 mt-2 max-w-prose">
              Watch extended highlights, goals, and key moments from the latest football matches.
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            >
              List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search matches, teams, leagues..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-yellow))]/50 focus:border-[rgb(var(--brand-yellow))]/50 transition-all bg-gradient-to-r from-white/5 to-white/0 hover:from-white/10 hover:to-white/5"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* League Filter */}
          <div className="flex gap-2 overflow-x-auto scroll-x-only no-scrollbar">
            <button
              onClick={() => setSelectedLeague('all')}
              className={`pill whitespace-nowrap ${
                selectedLeague === 'all' 
                  ? 'pill-active' 
                  : 'pill-muted hover:bg-white/10'
              }`}
            >
              All Leagues
            </button>
            {leagues.map(league => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league || 'all')}
                className={`pill whitespace-nowrap ${
                  selectedLeague === league
                    ? 'pill-active'
                    : 'pill-muted hover:bg-white/10'
                }`}
              >
                {league}
              </button>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="surface p-12 text-center">
          <div className="text-white/80 text-lg font-semibold">Loading matches...</div>
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-white/60 font-medium">
          {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} found
        </div>
      )}

      {/* Matches Grid/List */}
      {!loading && filteredMatches.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-white/80 text-lg font-semibold mb-2">No matches found</div>
          <div className="text-white/60">Try adjusting your search or filters</div>
        </div>
      ) : !loading && viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => setSelectedMatch(match)}
                onDetails={() => {
                  window.location.href = `/highlight/${encodeURIComponent(match.id)}`;
                }}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setDisplayCount(prev => prev + 12)}
                className="btn btn-primary px-8 py-3 text-base font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40"
              >
                See More
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-3">
            {displayedMatches.map((match) => (
              <MatchListItem
                key={match.id}
                match={match}
                onClick={() => {
                  window.location.href = `/highlight/${encodeURIComponent(match.id)}`;
                }}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setDisplayCount(prev => prev + 12)}
                className="btn btn-primary px-8 py-3 text-base font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40"
              >
                See More
              </button>
            </div>
          )}
        </>
      )}


      {/* Video Player Modal - supports both MP4 and iframe embeds */}
      {selectedMatch && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedMatch(null)} />
          <div className="absolute inset-0 p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-5xl surface shadow-glow">
              <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10">
                <div className="text-sm md:text-base font-semibold line-clamp-1">
                  {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                  {selectedMatch.league ? ` • ${selectedMatch.league}` : ''}
                </div>
                <button onClick={() => setSelectedMatch(null)} className="pill pill-muted">Close</button>
              </div>
              <div className="w-full aspect-video bg-black relative overflow-hidden">
                {selectedMatch.videoSrc ? (
                  selectedMatch.videoSrc.includes('.mp4') || selectedMatch.videoSrc.includes('streamable.com/video') ? (
                    <video
                      controls
                      autoPlay
                      className="absolute inset-0 w-full h-full"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    >
                      <source src={selectedMatch.videoSrc} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <iframe
                      title={`${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam} Highlights`}
                      src={selectedMatch.videoSrc}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full border-0"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
                    <div className="text-center space-y-4">
                      <div className="text-6xl md:text-7xl mb-4 opacity-50">🎬</div>
                      <div className="text-xl md:text-2xl font-bold text-white/80 mb-2">
                        Video Not Available
                      </div>
                      <div className="text-sm md:text-base text-white/60 max-w-md">
                        Highlights for this match are currently unavailable.
                      </div>
                    </div>
                    
                    {/* Decorative grid pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '50px 50px'
                    }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, onClick, onDetails }: { match: HighlightMatch; onClick: () => void; onDetails: () => void }) {
  return (
    <div
      className="surface p-6 group transition-all duration-300 hover:border-[rgb(var(--brand-yellow))]/30 hover:shadow-xl hover:shadow-[rgb(var(--brand-yellow))]/10 hover:-translate-y-1 cursor-pointer relative overflow-hidden"
      onClick={onDetails}
    >
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[rgb(var(--brand-yellow))]/10 rounded-full blur-2xl" />
      </div>
      
      <div className="relative z-10">
        {/* League Badge */}
        {(match.league || match.category) && (
          <div className="mb-4">
            <span className="pill pill-muted text-xs font-semibold hover:bg-white/10 transition-colors">
              {match.league || match.category}
            </span>
          </div>
        )}

        {/* Teams */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 text-right">
              <div className="font-bold text-white text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors">
                {match.homeTeam}
              </div>
            </div>
            <div className="text-white/40 font-light">vs</div>
            <div className="flex-1">
              <div className="font-bold text-white text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors">
                {match.awayTeam}
              </div>
            </div>
          </div>
          
          {/* Score */}
          {match.score && (
            <div className="text-center">
              <span className="text-3xl font-black text-[rgb(var(--brand-yellow))] drop-shadow-lg group-hover:scale-110 transition-transform inline-block">
                {match.score}
              </span>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between text-xs text-white/60 mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">📅</span>
            <span className="font-medium">{match.date}</span>
          </div>
          {match.time && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/40">⏰</span>
              <span className="font-medium">{match.time}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex-1 btn btn-primary text-sm font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40"
          >
            ▶ Watch
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetails();
            }}
            className="btn btn-ghost text-sm font-semibold hover:bg-white/15 hover:border-white/25 transition-all"
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchListItem({ match, onClick }: { match: HighlightMatch; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="surface p-5 cursor-pointer group transition-all duration-300 hover:border-[rgb(var(--brand-yellow))]/30 hover:shadow-lg hover:shadow-[rgb(var(--brand-yellow))]/10 hover:-translate-y-0.5 relative overflow-hidden"
    >
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[rgb(var(--brand-yellow))]/10 rounded-full blur-2xl" />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
        {/* Teams & Score */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="font-bold text-white text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors">
              {match.homeTeam}
            </div>
            <div className="text-white/40 font-light">vs</div>
            <div className="font-bold text-white text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors">
              {match.awayTeam}
            </div>
            {match.score && (
              <>
                <div className="text-white/40">•</div>
                <span className="text-xl font-black text-[rgb(var(--brand-yellow))] drop-shadow-lg">{match.score}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
            {(match.league || match.category) && (
              <span className="pill pill-muted text-xs font-semibold">{match.league || match.category}</span>
            )}
            <span className="font-medium">📅 {match.date}</span>
            {match.time && <span className="font-medium">⏰ {match.time}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // This will trigger the watch action
            }}
            className="btn btn-primary font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40"
          >
            ▶ Watch
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="btn btn-ghost font-semibold hover:bg-white/15 hover:border-white/25 transition-all"
          >
            Details →
          </button>
        </div>
      </div>
    </div>
  );
}

