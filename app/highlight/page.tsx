"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { type HighlightMatch } from './data';

export default function HighlightsPage() {
  const [matches, setMatches] = useState<HighlightMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<HighlightMatch | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState<boolean>(false);
  const [clickedMatchId, setClickedMatchId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Skip first 3 seconds of video to avoid ScoreBat branding
  useEffect(() => {
    if (!selectedMatch || !videoRef.current) return;
    
    const video = videoRef.current;
    const isVideoFile = selectedMatch.videoSrc?.includes('.mp4') || selectedMatch.videoSrc?.includes('streamable.com/video');
    
    if (!isVideoFile) return;
    
    const handleCanPlay = () => {
      if (video.currentTime < 3) {
        video.currentTime = 3;
      }
    };
    
    const handleLoadedMetadata = () => {
      if (video.duration > 3) {
        video.currentTime = 3;
      }
    };
    
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    if (video.readyState >= 1 && video.currentTime < 3) {
      video.currentTime = 3;
    }
    
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [selectedMatch]);

  // Fetch matches from API
  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch('/api/highlights');
        const data = await response.json();
        
        // Log response for debugging
        
        if (data.error) {
          // Still set matches to empty array, but log the error
        }
        
        if (data.matches) {
          setMatches(data.matches);
        } else {
          setMatches([]);
        }
      } catch (error) {
        setMatches([]);
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
    // Normalize league names using formatLeague to handle duplicates
    const normalizedLeagues = matches
      .map(m => {
        const raw = m.league || m.category;
        if (!raw) return null;
        return formatLeague(raw);
      })
      .filter(Boolean) as string[];
    
    // Use a Map to track original values by normalized name (keep first occurrence)
    const leagueMap = new Map<string, string>();
    matches.forEach(m => {
      const raw = m.league || m.category;
      if (!raw) return;
      const normalized = formatLeague(raw);
      if (!leagueMap.has(normalized)) {
        leagueMap.set(normalized, raw);
      }
    });
    
    // Return unique normalized leagues, sorted
    return Array.from(new Set(normalizedLeagues)).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const searchLower = (searchQuery || '').trim().toLowerCase();
    const leagueFilter = (selectedLeague || '').trim().toLowerCase();
    
    return matches.filter(match => {
      // League filtering first - normalize for comparison
      let matchesLeague = true;
      if (leagueFilter && leagueFilter !== 'all') {
        const matchRaw = match.league || match.category || '';
        const matchNormalized = formatLeague(matchRaw).toLowerCase();
        matchesLeague = matchNormalized === leagueFilter;
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
    <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden box-border relative">
      {/* Full-page loading overlay */}
      {clickedMatchId && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-[rgb(var(--brand-yellow))]/30 border-t-[rgb(var(--brand-yellow))] rounded-full animate-spin" />
            <span className="text-white/90 text-lg font-medium">Loading match details...</span>
          </div>
        </div>
      )}
      {/* Floating Header - League Filters */}
      {isScrolled && (
        <div
          className="fixed left-0 right-0 z-50 px-4 py-3 bg-[rgb(var(--bg))]/95 backdrop-blur-xl border-b border-white/10 shadow-xl"
          style={{ top: 'var(--header-height)' }}
        >
          <div className="container-narrow">
            <div className="hidden md:block w-full max-w-full box-border overflow-x-auto no-scrollbar scroll-x-only">
              <div className="flex items-center gap-2 md:gap-3 min-w-max pb-2">
                <button
                  onClick={() => {
                    setSelectedLeague('all');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={
                    "px-4 md:px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all duration-200 touch-manipulation whitespace-nowrap flex-shrink-0 " +
                    (selectedLeague === 'all'
                      ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                      : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                  }
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
                    className={
                      "px-4 md:px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all duration-200 touch-manipulation whitespace-nowrap flex-shrink-0 " +
                      (selectedLeague === league
                        ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                        : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                    }
                  >
                    {league}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow relative z-[100] overflow-x-hidden md:overflow-hidden group w-full max-w-full box-border">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        
        <div className="relative z-10">
        <div className="mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Football Highlights</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1">
              Match <span className="text-[rgb(var(--brand-yellow))]">Highlights</span>
            </h2>
            <p className="text-white/70 mt-2 max-w-prose text-sm sm:text-base">
              Watch extended highlights, goals, and key moments from the latest football matches.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 w-full max-w-full box-border">
          {/* Mobile/Tablet Filters - collapsible, like TodayMatches */}
          <div className="md:hidden relative z-10 w-full max-w-full box-border">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-visible w-full max-w-full box-border">
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
                      className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-yellow))]/50 focus:border-[rgb(var(--brand-yellow))]/50 transition-all bg-gradient-to-r from-white/5 to-white/0 hover:from-white/10 hover:to-white/5"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* League dropdown */}
                  <div className={`relative ${leagueDropdownOpen ? 'z-[10000]' : ''}`} data-dropdown>
                    <button
                      onClick={() => setLeagueDropdownOpen(!leagueDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      <span className="text-white text-sm font-medium">{selectedLeague === 'all' ? 'All Leagues' : selectedLeague}</span>
                      <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${leagueDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {leagueDropdownOpen && (
                      <>
                        {/* Backdrop to prevent interaction with cards and close on click */}
                        <div
                          className="fixed inset-0 z-[9990]"
                          onClick={() => setLeagueDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto">
                          <button
                            onClick={() => { setSelectedLeague('all'); setLeagueDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 ${selectedLeague === 'all' ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80'}`}
                          >
                            <span className="font-medium text-sm">All Leagues</span>
                            {selectedLeague === 'all' && (
                              <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          {leagues.map(league => (
                            <button
                              key={league}
                              onClick={() => { setSelectedLeague(league || 'all'); setLeagueDropdownOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0 ${selectedLeague === league ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80'}`}
                            >
                              <span className="font-medium text-sm">{league}</span>
                              {selectedLeague === league && (
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
          <div className="hidden md:block w-full max-w-full box-border">
          {/* Search */}
          <div className="w-full relative mb-3">
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
          
          {/* League Filter - Single scrollable row */}
          <div className="w-full max-w-full box-border overflow-x-auto no-scrollbar scroll-x-only">
            <div className="flex items-center gap-2 md:gap-3 min-w-max pb-2">
              <button
                onClick={() => setSelectedLeague('all')}
                className={
                  "px-4 md:px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all duration-200 touch-manipulation whitespace-nowrap flex-shrink-0 " +
                  (selectedLeague === 'all'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                    : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                }
              >
                All Leagues
              </button>
              {leagues.map(league => (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league || 'all')}
                  className={
                    "px-4 md:px-5 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-all duration-200 touch-manipulation whitespace-nowrap flex-shrink-0 " +
                    (selectedLeague === league
                      ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                      : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                  }
                >
                  {league}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
        </div>
      </section>

      {/* Loading State - Skeleton */}
      {loading && (
        <>
          <div className="text-sm text-white/60 font-medium mb-4">
            <div className="skeleton h-5 w-32 rounded" />
          </div>
          <div className="w-full max-w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="surface p-4 sm:p-6 space-y-4 w-full min-w-0 max-w-full">
                {/* League Badge Skeleton */}
                <div className="skeleton h-6 w-32 rounded-full" />
                
                {/* Teams Skeleton */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right">
                      <div className="skeleton h-6 w-24 rounded ml-auto" />
                    </div>
                    <div className="skeleton h-4 w-8 rounded" />
                    <div className="flex-1">
                      <div className="skeleton h-6 w-24 rounded" />
                    </div>
                  </div>
                  <div className="skeleton h-8 w-16 rounded mx-auto" />
                </div>
                
                {/* Date & Time Skeleton */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
                
                {/* Button Skeleton */}
                <div className="pt-1">
                  <div className="skeleton h-10 w-full rounded-lg" />
                </div>
              </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results Count */}
      {!loading && (
        <div className="flex items-center gap-2.5 px-3 py-1.5 w-fit -mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90">
              <span className="text-[rgb(var(--brand-yellow))] font-bold">{filteredMatches.length}</span>
              <span className="text-white/70 ml-1.5">{filteredMatches.length === 1 ? 'match' : 'matches'} found</span>
            </span>
          </div>
        </div>
      )}

      {/* Matches Grid */}
      {!loading && filteredMatches.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-white/80 text-lg font-semibold mb-2">No matches found</div>
          <div className="text-white/60">Try adjusting your search or filters</div>
        </div>
      ) : !loading && (
        <>
          <div className="w-full max-w-full box-border px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3 w-full box-border pt-2 pb-2">
              {displayedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                  onDetails={() => {
                    setClickedMatchId(match.id);
                    window.location.href = `/highlight/${encodeURIComponent(match.id)}`;
                  }}
                />
              ))}
            </div>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setDisplayCount(prev => prev + 12)}
                className="btn btn-primary px-8 py-3 text-base font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40"
              >
                Load More
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
                  {selectedMatch.league ? ` • ${formatLeague(selectedMatch.league)}` : ''}
                </div>
                <button onClick={() => setSelectedMatch(null)} className="pill pill-muted">Close</button>
              </div>
              <div className="w-full aspect-video bg-black relative overflow-hidden">
                {selectedMatch.videoSrc ? (
                  selectedMatch.videoSrc.includes('.mp4') || selectedMatch.videoSrc.includes('streamable.com/video') ? (
                    <video
                      ref={videoRef}
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

// Format league text for badges in cards: drop country/region prefix like "SPAIN:" or "ASIA:"
function formatLeague(leagueOrCategory?: string) {
  // Fix common typos coming from some feeds.
  const raw = (leagueOrCategory || '').trim();
  let corrected = raw.replace(/Leaguage/gi, 'League');
  
  // Remove all prefixes (country or region): "COUNTRY: League Name" or "REGION: League Name"
  // Pattern matches: one or more uppercase letters/words followed by colon and optional space
  corrected = corrected.replace(/^[A-Z\s]+:\s*/, '');
  
  // Remove common suffixes like ", Group Stage", ", Knockout Stage", ", League Stage", etc.
  corrected = corrected.replace(/,\s*(Group Stage|Knockout Stage|League Stage|Round of \d+|Quarter[- ]?Final|Semi[- ]?Final|Final|Playoff|Play[- ]?off)$/gi, '');
  
  return corrected.trim();
}

// Format times like "11:00:00 PM" -> "23:00" or "11:00 PM" -> "23:00"
function formatTimeShort(raw?: string): string {
  const text = (raw || '').trim();
  if (!text) return '';
  const m = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/);
  if (!m) {
    // Fallback: strip seconds if present
    return text.replace(/:(\d{2})(\s*[AP]M)?$/i, '$1').replace(/:(\d{2}):\d{2}/, ':$1').replace(/\s*(AM|PM)$/i, '');
  }
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const ampm = m[4]?.toUpperCase();
  if (ampm === 'AM') {
    if (hour === 12) hour = 0;
  } else if (ampm === 'PM') {
    if (hour !== 12) hour += 12;
  }
  const hh = hour.toString().padStart(2, '0');
  return `${hh}:${minute}`;
}

// Remove seconds if present in a date string like "11/3/2025, 11:00:00 PM"
function formatDateNoSeconds(dateText?: string): string {
  const s = (dateText || '').trim();
  if (!s) return '';
  // Replace ":ss" when it's part of the time component
  return s.replace(/(\d{1,2}):(\d{2}):\d{2}(\s*[AP]M)/i, (_, h, m, ampm) => `${h}:${m}${ampm}`);
}

// Extract only the date part, removing time
function formatDateOnly(dateText?: string): string {
  const s = (dateText || '').trim();
  if (!s) return '';
  // Extract date part before comma (e.g., "11/5/2025, 11:00 PM" -> "11/5/2025")
  const match = s.match(/^([^,]+)/);
  return match ? match[1].trim() : s.split(',')[0].trim();
}

function MatchCard({ match, onClick, onDetails }: { match: HighlightMatch; onClick: () => void; onDetails: () => void }) {
  return (
    <div
      className="surface p-5 sm:p-6 group transition-all duration-300 hover:border-[rgb(var(--brand-yellow))]/40 hover:shadow-2xl hover:shadow-[rgb(var(--brand-yellow))]/15 hover:-translate-y-1 cursor-pointer relative overflow-hidden h-full flex flex-col w-full min-w-0 max-w-full box-border border border-white/10"
      onClick={onDetails}
    >
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-yellow))]/5 via-transparent to-transparent" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* League + Date Row */}
        {(match.league || match.category) && (
          <div className="mb-4 flex items-center justify-between gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] font-medium text-white/70 hover:bg-white/10 transition-colors whitespace-nowrap flex-shrink-0">
              {formatLeague(match.league || match.category)}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-white/50 flex-shrink-0">
              <span className="font-medium whitespace-nowrap">{formatDateOnly(match.date)}</span>
            </div>
          </div>
        )}

        {/* Teams */}
        <div className="space-y-3 mb-5 min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-1 text-right min-w-0">
              <div className="font-semibold text-white text-base sm:text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors break-words leading-tight">
                {match.homeTeam}
              </div>
            </div>
            <div className="text-white/30 font-light text-xs flex-shrink-0 px-1">vs</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-base sm:text-lg group-hover:text-[rgb(var(--brand-yellow))] transition-colors break-words leading-tight">
                {match.awayTeam}
              </div>
            </div>
          </div>
          
          {/* Score */}
          {match.score && (
            <div className="text-center pt-1">
              <span className="text-2xl sm:text-3xl font-bold text-[rgb(var(--brand-yellow))] group-hover:scale-105 transition-transform inline-block tracking-tight">
                {match.score}
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetails();
            }}
            className="w-full rounded-lg border border-[rgb(var(--brand-yellow))] bg-transparent text-[rgb(var(--brand-yellow))] font-bold text-xs px-3 sm:px-4 py-2 transition-all duration-200 hover:bg-[rgb(var(--brand-yellow))] hover:text-black hover:shadow-lg hover:shadow-[rgb(var(--brand-yellow))]/30 active:scale-[0.98] flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}

