"use client";

import AvatarFallback from '@/components/AvatarFallback';
import PlayerOverlay from '@/components/PlayerOverlay';
import { enrichGames } from '@/lib/catalog';
import { getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

type GameItem = {
  id: string;
  sport: string;
  league: string;
  home: string;
  away: string;
  time: string;
  thumb?: string;
  videoSrc: string;
};

  type Prediction = {
  gameId: string;
  predictedWinner: 'home' | 'away' | 'draw';
  confidence: number;
  points?: number;
  predictedScore?: { home: number; away: number };
  predictedScoreDisplay?: string; // Display format like "3-1"
  status?: 'won' | 'failed' | null;
  msbs?: string; // Over type like "Over 1.5"
  actualScore?: string | null; // Actual match score
  matchDate?: string;
  createdAt?: string;
  timeLabel?: string;
};

const DEFAULT_SRC = 'https://voodc.com/embed/1/85818c92a38e9e86847a8599a08f9887847c.html';

// Generate dates for current week (Monday to Sunday)
function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday of current week
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  const weekDates: Record<string, Date> = {};
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  dayNames.forEach((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    weekDates[day] = date;
  });
  
  return weekDates;
}

// Calculate if over 1.5 is won (total goals >= 2)
function calculateOver15Status(actualScore: string | null): 'won' | 'failed' | null {
  if (!actualScore) return null;
  
  // Extract goals from score like "2-1" or "3-0"
  const match = actualScore.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!match) return null;
  
  const homeGoals = parseInt(match[1], 10);
  const awayGoals = parseInt(match[2], 10);
  const totalGoals = homeGoals + awayGoals;
  
  // For Over 1.5, we need >= 2 goals
  if (totalGoals >= 2) {
    return 'won';
  } else {
    return 'failed';
  }
}

// Mock predictions data with dates for each day of the week
function generateMockPredictions(): any[] {
  const weekDates = getWeekDates();
  const leagues = ['Brazil', 'Meksika', 'Uruguay', 'Paraguay', 'Venezuela', 'Kosta Rika', 'Japonya', 'Almanya', 'Ingiltere', 'Spain'];
  const teams = [
    ['Atletico', 'Paysandu'], ['Guadalajara', 'Necaxa'], ['Toluca', 'Puebla'],
    ['Montevideo', 'Boston'], ['Deportivo', 'Monagas'], ['Sporting', 'CS'],
    ['Honda', 'Okinawa'], ['Bayern', 'Dortmund'], ['Arsenal', 'Chelsea'],
    ['Real Madrid', 'Barcelona']
  ];
  const times = ['01:00', '02:00', '02:30', '05:00', '07:00', '10:00', '14:00', '16:00', '19:00', '22:00'];
  const overType = 'Over 1.5'; // Only use Over 1.5 predictions
  
  const mockData: any[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  dayNames.forEach((day, dayIndex) => {
    const matchesPerDay = 10 + Math.floor(Math.random() * 15); // 10-24 matches per day
    
    for (let i = 0; i < matchesPerDay; i++) {
      const leagueIndex = Math.floor(Math.random() * leagues.length);
      const teamIndex = Math.floor(Math.random() * teams.length);
      const timeIndex = Math.floor(Math.random() * times.length);
      
      // Generate predicted score
      const predictedHomeGoals = Math.floor(Math.random() * 4) + 1; // 1-4 goals
      const predictedAwayGoals = Math.floor(Math.random() * 4); // 0-3 goals
      const predictedScoreDisplay = `${predictedHomeGoals} - ${predictedAwayGoals}`;
      
      // Generate actual score - sometimes finished, sometimes pending
      const isFinished = Math.random() > 0.3; // 70% finished
      let actualScore: string | null = null;
      let status: 'won' | 'failed' | null = null;
      
      if (isFinished) {
        // Generate realistic scores
        const homeGoals = Math.floor(Math.random() * 5);
        const awayGoals = Math.floor(Math.random() * 5);
        actualScore = `${homeGoals} - ${awayGoals}`;
        status = calculateOver15Status(actualScore);
      }
      
      mockData.push({
        id: `${day.toLowerCase()}-${leagueIndex}-${i}`,
        sport: 'Football',
        league: leagues[leagueIndex],
        home: teams[teamIndex][0],
        away: teams[teamIndex][1],
        timeLabel: times[timeIndex],
        msbs: overType,
        predictedScoreDisplay: predictedScoreDisplay,
        actualScore: actualScore,
        status: status,
        matchDate: weekDates[day].toISOString().split('T')[0], // Store as YYYY-MM-DD
        createdAt: weekDates[day].toISOString(),
      });
    }
  });
  
  return mockData;
}

function TeamLogo({ logo, name, size = 40, className = "" }: { logo?: string; name: string; size?: number; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (!logo || hasError) {
    return <AvatarFallback name={name} size={size} />;
  }
  
  let imgClassName = "object-contain rounded-full";
  if (size > 30) {
    imgClassName = "w-10 h-10 object-contain rounded-full";
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

// Parse date string handling different formats (DD-MM-YYYY or YYYY-MM-DD)
function parseDate(dateStr: string | Date | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  try {
    // If it's in DD-MM-YYYY format (from Firestore)
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      
      // Check if it's DD-MM-YYYY format (e.g., "02-11-2025")
      if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      
      // Check if it's YYYY-MM-DD format (e.g., "2025-11-02")
      if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard Date parsing
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date();
    return date;
  } catch {
    return new Date();
  }
}

// Get day of week name from date string or Date object
function getDayOfWeek(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  
  try {
    const date = parseDate(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch {
    return '';
  }
}

export default function PredictionsPage() {
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [entries, setEntries] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch predictions from Firestore API
  const fetchPredictions = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      // Add timestamp to bust cache
      const timestamp = Date.now();
      const res = await fetch(`/api/predictions?t=${timestamp}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch predictions: ${res.status}`);
      }
      
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
        console.log(`📊 Loaded ${data.length} prediction(s) from API`);
      } else {
        console.error('Invalid data format received from API');
        setEntries([]);
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setEntries([]); // Set empty array instead of mock data
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchPredictions();
    
    // Refresh predictions every 30 seconds to catch updates (silently in background)
    const interval = setInterval(() => {
      fetchPredictions(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const enrichedGames = useMemo(() => {
    return enrichGames(entries.map((m: any) => ({
      sport: m.sport,
      league: m.league,
      home: m.home,
      away: m.away,
      videoSrc: '',
      time: m.timeLabel || '',
    })));
  }, [entries]);

  const gamesWithPredictions = useMemo(() => {
    return enrichedGames.map((game, idx) => {
      const src = entries[idx];
      return {
        game,
        prediction: {
          gameId: src?.id,
          predictedWinner: 'home',
          confidence: 0,
          status: src?.status || null,
          msbs: src?.msbs, // This is now the over type like "Over 1.5"
          predictedScoreDisplay: src?.predictedScoreDisplay || src?.predictedScore,
          actualScore: src?.actualScore,
          matchDate: src?.matchDate || src?.matchDateISO,
          createdAt: src?.createdAt,
          timeLabel: src?.timeLabel,
        } as Prediction,
      };
    });
  }, [enrichedGames, entries]);

  // Group predictions by day of week
  const groupedByDay = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let skippedCount = 0;
    
    gamesWithPredictions.forEach((entry, idx) => {
      const dayName = getDayOfWeek(entry.prediction.matchDate || entry.prediction.createdAt);
      
      if (!dayName) {
        // Log skipped entries for debugging
        console.warn('Skipped entry due to invalid date:', {
          index: idx,
          matchDate: entry.prediction.matchDate,
          createdAt: entry.prediction.createdAt,
          home: entry.game?.home?.name,
          away: entry.game?.away?.name,
        });
        skippedCount++;
        // Still add to a fallback group instead of skipping completely
        const fallbackDay = 'Unknown';
        if (!groups[fallbackDay]) groups[fallbackDay] = [];
        groups[fallbackDay].push(entry);
        return;
      }
      
      if (!groups[dayName]) groups[dayName] = [];
      groups[dayName].push(entry);
    });
    
    if (skippedCount > 0) {
      console.warn(`⚠️ Skipped ${skippedCount} entry(ies) due to invalid dates`);
    }
    
    // Debug: log grouping summary
    const totalGrouped = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📅 Grouped ${totalGrouped} entries into ${Object.keys(groups).length} day(s):`, 
      Object.entries(groups).map(([day, arr]) => `${day} (${arr.length})`).join(', ')
    );
    
    return groups;
  }, [gamesWithPredictions]);

  const dayKeys = useMemo(() => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const availableDays = Object.keys(groupedByDay);
    const orderedDays = dayOrder.filter(day => availableDays.includes(day));
    // Add any remaining days (like "Unknown") at the end
    const remainingDays = availableDays.filter(day => !dayOrder.includes(day));
    return [...orderedDays, ...remainingDays];
  }, [groupedByDay]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMatches = entries.length;
    const played = entries.filter((e: any) => e.status === 'won' || e.status === 'failed').length;
    const won = entries.filter((e: any) => e.status === 'won').length;
    const successRate = played > 0 ? Math.round((won / played) * 100) : 0;
    
    return {
      totalMatches,
      played,
      successRate,
    };
  }, [entries]);

  // Initialize expanded state - expand first day by default
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    if (dayKeys[0]) defaults[dayKeys[0]] = true;
    setExpandedKeys(prev => ({ ...defaults, ...prev }));
  }, [dayKeys.join('|')]);

  function toggleKey(key: string, value?: boolean) {
    setExpandedKeys(prev => ({ ...prev, [key]: value ?? !prev[key] }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    dayKeys.forEach(k => next[k] = true);
    setExpandedKeys(next);
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    dayKeys.forEach(k => next[k] = false);
    setExpandedKeys(next);
  }

  // Show loading state until client-side hydration completes
  if (!isMounted) {
    return (
      <div className="space-y-10">
        <section className="surface p-5 md:p-6 hero-glow relative">
          <div className="flex items-center justify-center py-20">
            <div className="text-white/60">Loading predictions...</div>
          </div>
        </section>
      </div>
    );
  }

  // Show empty state if no predictions found
  if (isMounted && entries.length === 0) {
    return (
      <div className="space-y-10">
        <section className="surface p-5 md:p-6 hero-glow relative">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-white/60 mb-2">No predictions found</div>
              <div className="text-white/40 text-sm">Predictions will appear here once they are added</div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="surface p-5 md:p-6 hero-glow relative" style={{ isolation: 'isolate', overflow: 'visible' }}>
        {/* Animated background gradient - fixed positioning */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0 rounded-xl overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl" 
               style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" 
               style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10" style={{ isolation: 'isolate' }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Football Predictions</div>
              <h2 className="text-2xl md:text-3xl font-extrabold mt-1">
                Weekly <span className="text-[rgb(var(--brand-yellow))]">Predictions</span>
              </h2>
              <p className="text-white/70 mt-2 max-w-prose">
                View all your predictions organized by day of the week. Track your success rate and see which predictions have been resolved.
              </p>
            </div>
            <div>
              <button
                onClick={() => fetchPredictions(true)}
                disabled={isRefreshing}
                className="pill pill-active disabled:opacity-50 flex items-center gap-2"
                title="Refresh predictions"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-white/10 bg-white/5 rounded-lg p-5 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Total Matches</div>
              <div className="text-3xl font-bold text-[rgb(var(--brand-yellow))]">{stats.totalMatches}</div>
            </div>
            <div className="border border-white/10 bg-white/5 rounded-lg p-5 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Played</div>
              <div className="text-3xl font-bold">{stats.played}</div>
            </div>
            <div className="border border-white/10 bg-white/5 rounded-lg p-5 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all">
              <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Success Rate</div>
              <div className="text-3xl font-bold">{stats.successRate}%</div>
            </div>
          </div>

          {/* Sticky chips to jump to days */}
          <div className="sticky-rail -mx-4 px-4 py-2 relative">
            <div className="fade-left"></div>
            <div className="fade-right"></div>
            <div className="flex items-center gap-2">
              {/* Middle scrollable chips */}
              <div className="flex-1 scroll-x-only no-scrollbar">
                <div className="flex items-center gap-2 w-max">
                  {dayKeys.map(day => (
                    <button
                      key={day}
                      onClick={() => { 
                        const el = groupRefs.current[day]; 
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                        toggleKey(day, true); 
                      }}
                      className={"pill whitespace-nowrap " + (expandedKeys[day] ? 'pill-active' : 'pill-muted')}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              {/* Right fixed controls */}
              <div className="ml-2 flex items-center gap-2">
                <button className="pill pill-muted" onClick={expandAll}>Expand all</button>
                <button className="pill pill-muted" onClick={collapseAll}>Collapse all</button>
              </div>
            </div>
          </div>

          {/* Predictions List */}
          {gamesWithPredictions.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <p>No predictions found</p>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
          {dayKeys.map((day) => {
            const entries = groupedByDay[day] || [];
            const isOpen = !!expandedKeys[day];
            return (
              <div key={day} className="space-y-3" ref={el => { groupRefs.current[day] = el; }}>
                <button onClick={() => toggleKey(day)} className="w-full flex items-center gap-3 group">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">{day}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                  <span className="text-xs text-white/50 mr-2">{entries.length} {entries.length === 1 ? 'match' : 'matches'}</span>
                  <span className={"text-xs text-white/70 transition-transform " + (isOpen ? 'rotate-90' : '')}>›</span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {entries.map(({ game, prediction }) => {
                      // Determine status colors
                      const predictionStatus = prediction?.status;
                      const isWon = predictionStatus === 'won';
                      const isFailed = predictionStatus === 'failed';
                      const isFinished = !!prediction?.actualScore;
                      
                      return (
                        <div
                          key={game.sport + '-' + game.home.name + '-' + day}
                          className={`text-left group rounded-xl overflow-hidden transition-all duration-200 relative ${
                            isWon
                              ? 'border-2 border-green-500/60 bg-gradient-to-br from-green-500/15 to-green-500/5 shadow-lg shadow-green-500/20'
                              : isFailed
                              ? 'border-2 border-red-500/60 bg-gradient-to-br from-red-500/15 to-red-500/5 shadow-lg shadow-red-500/20'
                              : 'border border-white/10 bg-gradient-to-br from-white/8 to-white/3 hover:border-[rgb(var(--brand-yellow))]/30 hover:shadow-lg hover:shadow-[rgb(var(--brand-yellow))]/10'
                          }`}
                          style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                        >
                          {/* Animated glow effect on hover - properly contained */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0 overflow-hidden rounded-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[rgb(var(--brand-yellow))]/10 rounded-full blur-2xl" />
                          </div>
                          
                          <div className="p-3 space-y-2 relative z-10" style={{ isolation: 'isolate' }}>
                            {/* League and Time */}
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">{game.league}</div>
                              {game.time && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-[10px] text-white/60 font-mono">{game.time}</span>
                                </div>
                              )}
                            </div>

                            {/* Match Info */}
                            <div className="flex items-center gap-2 py-1">
                              <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                <div className="duel-pedestal w-10 h-10 grid place-items-center overflow-hidden shrink-0 transition-transform duration-200" style={{ transform: 'translateZ(0)' }}>
                                  <TeamLogo logo={game.home.logo} name={game.home.name} size={32} />
                                  <div className="duel-gloss" />
                                </div>
                                <div className="font-bold text-[11px] truncate max-w-[5rem] text-center leading-tight text-white/90" title={game.home.name}>
                                  {getDisplayName(game.home.name)}
                                </div>
                              </div>

                              <div className="flex flex-col items-center gap-1 min-w-[4rem]">
                                {isFinished && prediction.actualScore ? (
                                  <>
                                    <span className="text-[16px] font-black text-[rgb(var(--brand-yellow))] drop-shadow-lg">
                                      {prediction.actualScore}
                                    </span>
                                    <span className="text-[8px] text-white/40 uppercase">Final</span>
                                    {prediction?.predictedScoreDisplay && (
                                      <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-1 rounded border-[0.5px] border-white/10 bg-white/5">
                                        <span className="text-[9px] text-white/50 font-medium leading-none">Pred:</span>
                                        <span className="text-[11px] font-bold text-white/70 leading-none tabular-nums">{prediction.predictedScoreDisplay}</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-white/40 text-[10px] font-bold mb-1">VS</span>
                                    {prediction?.predictedScoreDisplay && (
                                      <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[rgb(var(--brand-yellow))]/20 to-[rgb(var(--brand-yellow))]/10 border border-[rgb(var(--brand-yellow))]/40 shadow-md">
                                        <div className="flex items-center gap-1.5">
                                          <svg className="w-3 h-3 text-[rgb(var(--brand-yellow))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                          </svg>
                                          <span className="text-[12px] font-black text-[rgb(var(--brand-yellow))] tabular-nums">{prediction.predictedScoreDisplay}</span>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                <div className="duel-pedestal w-10 h-10 grid place-items-center overflow-hidden shrink-0 transition-transform duration-200" style={{ transform: 'translateZ(0)' }}>
                                  <TeamLogo logo={game.away.logo} name={game.away.name} size={32} />
                                  <div className="duel-gloss" />
                                </div>
                                <div className="font-bold text-[11px] truncate max-w-[5rem] text-center leading-tight text-white/90" title={game.away.name}>
                                  {getDisplayName(game.away.name)}
                                </div>
                              </div>
                            </div>

                            {/* Over Prediction & Status */}
                            <div className="pt-2 border-t border-white/10">
                              <div className="flex flex-col items-center gap-2">
                                {/* Prediction Badge */}
                                <div className="flex items-center justify-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[rgb(var(--brand-yellow))]/20 border border-[rgb(var(--brand-yellow))]/40 text-[rgb(var(--brand-yellow))] text-[11px] font-bold">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Over 1.5
                                  </span>
                                </div>
                                
                                {/* Status Indicator */}
                                {isWon && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/25 to-green-500/10 border border-green-500/30 w-full justify-center">
                                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-[11px] font-bold text-green-300">Won</span>
                                  </div>
                                )}
                                {isFailed && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500/25 to-red-500/10 border border-red-500/30 w-full justify-center">
                                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-[11px] font-bold text-red-300">Lost</span>
                                  </div>
                                )}
                                {!isWon && !isFailed && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-full justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                                    <span className="text-[11px] font-medium text-white/60">Pending</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </div>
      </section>

      <PlayerOverlay
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.home} vs ${selected.away} • ${selected.league}` : ''}
        src={selected?.videoSrc || DEFAULT_SRC}
      />
    </div>
  );
}
