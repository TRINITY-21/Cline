"use client";

import { getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

type Match = {
  id: string;
  home: string;
  away: string;
  time: string;
  timeLabel?: string;
  league: string;
  pattern?: string;
  bet?: string;
  betType: 'Over 1.5 Goals' | 'Over 2.5 Goals';
  confidence?: string;
  ms1?: string;
  ms0?: string;
  ms2?: string;
  result?: string;
  homeScore?: number;
  awayScore?: number;
  totalGoals?: number;
  status?: 'PENDING' | 'WON' | 'FAILED';
  category?: 'PERFECT' | 'NEAR-PERFECT' | 'STRONG_FAVORITE';
  matchDate?: string;
  overOdds?: number;
  score?: number;
};


// Get day of week from date string (DD-MM-YYYY format)
function getDayOfWeek(dateStr: string): string {
  const [day, month, year] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Group matches by day of week
function groupMatchesByDay(matches: Match[]): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {};
  
  matches.forEach(match => {
    // Use matchDate if available, otherwise use today
    const dateStr = match.matchDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const dayName = getDayOfWeek(dateStr);
    
    if (!grouped[dayName]) {
      grouped[dayName] = [];
    }
    
    grouped[dayName].push(match);
  });
  
  // Sort matches by time
  Object.keys(grouped).forEach(dayKey => {
    grouped[dayKey].sort((a, b) => {
      const timeA = a.timeLabel || a.time || '00:00';
      const timeB = b.timeLabel || b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  });
  
  return grouped;
}

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Over 1.5 Goals' | 'Over 2.5 Goals'>('all');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [dayDropdownOpen, setDayDropdownOpen] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch predictions from Firestore
  useEffect(() => {
    let cancelled = false;
    async function fetchPredictions() {
      try {
        setLoading(true);
        const response = await fetch('/api/predictions', { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!cancelled) {
          if (data.error) {
            console.error('Error fetching predictions:', data.error, data.details);
            // Show error but still set empty array
            setPredictions([]);
          } else if (Array.isArray(data)) {
            // Transform API data to Match format
            const transformed: Match[] = data.map((pred: any) => ({
              id: pred.id || `${pred.home}-vs-${pred.away}`,
              home: pred.home || '',
              away: pred.away || '',
              time: pred.timeLabel || pred.time || '00:00',
              timeLabel: pred.timeLabel || pred.time || '00:00',
              league: pred.league || 'Unknown League',
              pattern: pred.pattern || '',
              bet: pred.overOdds ? `Over 1.5 Goals @ ${pred.overOdds}` : 'Over 1.5 Goals',
              betType: pred.betType || 'Over 1.5 Goals',
              confidence: pred.confidence || (pred.score ? `Score: ${pred.score}` : ''),
              ms1: pred.ms1 || '',
              ms0: pred.ms0 || '',
              ms2: pred.ms2 || '',
              result: pred.result || undefined,
              homeScore: pred.homeScore,
              awayScore: pred.awayScore,
              totalGoals: pred.totalGoals,
              status: pred.status || (pred.result ? (pred.totalGoals && pred.totalGoals > 1 ? 'WON' : 'FAILED') : 'PENDING'),
              category: pred.category || 'PERFECT',
              matchDate: pred.matchDate,
              overOdds: pred.overOdds,
              score: pred.score,
            }));
            setPredictions(transformed);
            console.log(`✅ Loaded ${transformed.length} predictions from Firestore`);
          } else {
            console.warn('Unexpected API response format:', data);
            setPredictions([]);
          }
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        if (!cancelled) {
          setPredictions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchPredictions();
    return () => { cancelled = true; };
  }, []);

  // Filter matches based on selected filter
  const filteredMatches = useMemo(() => {
    if (selectedFilter === 'all') {
      return predictions;
    }
    return predictions.filter(m => m.betType === selectedFilter);
  }, [predictions, selectedFilter]);

  // Group matches by day
  const groupedByDay = useMemo(() => {
    return groupMatchesByDay(filteredMatches);
  }, [filteredMatches]);

  // All available days (for dropdown) - from all matches, not filtered
  const allAvailableDays = useMemo(() => {
    const allMatchesGrouped = groupMatchesByDay(predictions);
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDays = Object.keys(allMatchesGrouped);
    const orderedDays = dayOrder.filter(day => availableDays.includes(day));
    const remainingDays = availableDays.filter(day => !dayOrder.includes(day));
    return [...orderedDays, ...remainingDays];
  }, [predictions]);

  const dayKeys = useMemo(() => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDays = Object.keys(groupedByDay);
    const orderedDays = dayOrder.filter(day => availableDays.includes(day));
    const remainingDays = availableDays.filter(day => !dayOrder.includes(day));
    const allDays = [...orderedDays, ...remainingDays];
    
    // Filter by selected day if not 'all'
    if (selectedDay !== 'all') {
      return allDays.filter(day => day === selectedDay);
    }
    return allDays;
  }, [groupedByDay, selectedDay]);

  // Initialize expanded state - expand first day by default or selected day
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    if (selectedDay !== 'all' && dayKeys.includes(selectedDay)) {
      defaults[selectedDay] = true;
    } else if (dayKeys[0]) {
      defaults[dayKeys[0]] = true;
    }
    setExpandedKeys(prev => ({ ...defaults, ...prev }));
  }, [dayKeys.join('|'), selectedDay]);

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

  // Calculate stats
  const stats = useMemo(() => {
    const totalMatches = filteredMatches.length;
    const over15Matches = filteredMatches.filter(m => m.betType === 'Over 1.5 Goals').length;
    const over25Matches = filteredMatches.filter(m => m.betType === 'Over 2.5 Goals').length;
    
    return {
      totalMatches,
      over15Matches,
      over25Matches,
    };
  }, [filteredMatches]);

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden box-border">
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow relative w-full max-w-full box-border overflow-x-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0 rounded-xl overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl" 
               style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" 
               style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Subtle Pattern Matches - 08-11-2025</div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1">
                Premium <span className="text-[rgb(var(--brand-yellow))]">Predictions</span>
              </h2>
              <p className="text-white/70 mt-2 text-sm sm:text-base max-w-prose">
                High-confidence predictions based on historical pattern analysis. Only Over 1.5 Goals and Over 2.5 Goals matches.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Total Matches</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--brand-yellow))]">{stats.totalMatches}</div>
            </div>
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Over 1.5 Goals</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95">{stats.over15Matches}</div>
            </div>
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Over 2.5 Goals</div>
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white/95">{stats.over25Matches}</div>
            </div>
          </div>

          {/* Mobile Filters - collapsible */}
          <div className="md:hidden mb-6 relative z-10 w-full max-w-full box-border">
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
                <div className="px-4 pb-4 pt-2 relative">
                  {/* Day Dropdown */}
                  <div className={`relative ${dayDropdownOpen ? 'z-[10000]' : ''}`} data-dropdown>
                    <button
                      onClick={() => setDayDropdownOpen(!dayDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      <span className="text-white text-sm font-medium">
                        {selectedDay === 'all' ? 'All Days' : selectedDay}
                      </span>
                      <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${dayDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {dayDropdownOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-[9990]"
                          onClick={() => setDayDropdownOpen(false)}
                        />
                        {/* Dropdown Menu */}
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl z-[10001] max-h-64 overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedDay('all');
                              setDayDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 ${selectedDay === 'all' ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80'}`}
                          >
                            <span className="font-medium text-sm">All Days</span>
                            {selectedDay === 'all' && (
                              <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          {allAvailableDays.map(day => (
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedDay(day);
                                setDayDropdownOpen(false);
                                const el = groupRefs.current[day];
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                toggleKey(day, true);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0 ${selectedDay === day ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80'}`}
                            >
                              <span className="font-medium text-sm">{day}</span>
                              {selectedDay === day && (
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

          {/* Bet Type Filters - Outside filter card, single row */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedFilter === 'all'
                  ? 'bg-[rgb(var(--brand-yellow))]/75 text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setSelectedFilter('Over 1.5 Goals')}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedFilter === 'Over 1.5 Goals'
                  ? 'bg-[rgb(var(--brand-yellow))]/75 text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              Over 1.5
            </button>
            <button 
              onClick={() => setSelectedFilter('Over 2.5 Goals')}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                selectedFilter === 'Over 2.5 Goals'
                  ? 'bg-[rgb(var(--brand-yellow))]/75 text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              Over 2.5
            </button>
          </div>

          {/* Desktop Filters - always visible */}
          <div className="hidden md:block space-y-4 mb-6">
            {/* Filter Chips */}
            <div className="flex items-center gap-3 w-full relative z-20">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === 'all'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black'
                    : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm'
                }`}
              >
                All Matches
              </button>
              <button
                onClick={() => setSelectedFilter('Over 1.5 Goals')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === 'Over 1.5 Goals'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black'
                    : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm'
                }`}
              >
                Over 1.5 Goals
              </button>
              <button 
                onClick={() => setSelectedFilter('Over 2.5 Goals')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === 'Over 2.5 Goals'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black'
                    : 'bg-white/[0.02] text-white/70 hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm'
                }`}
              >
                Over 2.5 Goals
              </button>
            </div>

            {/* Day filters */}
            <div className="sticky-rail -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 relative">
              <div className="fade-left"></div>
              <div className="fade-right"></div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex-1 scroll-x-only no-scrollbar min-w-0 overflow-x-auto">
                  <div className="flex items-center gap-1.5 sm:gap-2 w-max">
                    {dayKeys.map(day => (
                      <button
                        key={day}
                        onClick={() => { 
                          const el = groupRefs.current[day]; 
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                          toggleKey(day, true); 
                        }}
                        className={"pill whitespace-nowrap touch-manipulation min-h-[32px] text-xs " + (expandedKeys[day] ? 'pill-active' : 'pill-muted')}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-1.5 sm:ml-2 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button className="pill pill-muted touch-manipulation min-h-[32px] text-xs whitespace-nowrap" onClick={expandAll}>Expand</button>
                  <button className="pill pill-muted touch-manipulation min-h-[32px] text-xs whitespace-nowrap" onClick={collapseAll}>Collapse</button>
                </div>
              </div>
            </div>
          </div>

          {/* Matches List */}
          {loading ? (
            <div className="text-center py-12 text-white/60">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[rgb(var(--brand-yellow))] border-t-transparent rounded-full animate-spin"></div>
                <p>Loading predictions from Firestore...</p>
              </div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-white/60 space-y-2">
              <p className="text-lg font-medium">No predictions found</p>
              <p className="text-sm text-white/50">Check back later for today's matches!</p>
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
                  <div className="space-y-3">
                        {entries.map((match) => {
                          const isOver15 = match.betType === 'Over 1.5 Goals';
                          const isOver25 = match.betType === 'Over 2.5 Goals';
                      
                      return (
                        <div
                              key={match.id}
                              className="group rounded-xl overflow-hidden transition-all duration-300 relative border-l-4 border-white/[0.12] bg-white/[0.02] backdrop-blur-sm hover:border-l-white/[0.20] hover:bg-white/[0.04] hover:shadow-sm"
                          style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                        >
                          {/* Subtle hover glow */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0 overflow-hidden rounded-xl">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[rgb(var(--brand-yellow))]/5 rounded-full blur-3xl" />
                          </div>
                          
                          <div className="p-4 sm:p-5 relative z-10">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
                              {/* League & Time Section */}
                                  <div className="flex-shrink-0 lg:w-40 space-y-1">
                                    <div className="text-[10px] sm:text-[11px] text-white/70 uppercase tracking-wider font-semibold truncate">{match.league}</div>
                                  <div className="flex items-center gap-1.5 text-white/50">
                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                      <span className="text-[10px] sm:text-xs font-mono font-medium">{match.timeLabel || match.time}</span>
                                    </div>
                              </div>

                                  {/* Teams Section */}
                              <div className="flex-1 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 lg:gap-6 min-w-0">
                                {/* Home Team */}
                                <div className="flex-1 min-w-0 text-center sm:text-left">
                                      <div className="font-semibold text-xs sm:text-sm lg:text-base text-white/95 truncate" title={match.home}>
                                        {getDisplayName(match.home)}
                                      </div>
                                    </div>

                                    {/* VS Display */}
                                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                      <span className="text-[10px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">VS</span>
                                </div>

                                {/* Away Team */}
                                <div className="flex-1 min-w-0 text-center sm:text-right">
                                      <div className="font-semibold text-xs sm:text-sm lg:text-base text-white/95 truncate" title={match.away}>
                                        {getDisplayName(match.away)}
                                  </div>
                                </div>
                              </div>

                                  {/* Prediction & Bet Section */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-shrink-0 justify-center lg:justify-end">
                                    {/* Bet Type Badge */}
                                    <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold backdrop-blur-sm whitespace-nowrap ${
                                      isOver15 
                                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' 
                                        : 'bg-green-500/15 border-green-500/40 text-green-300'
                                    }`}>
                                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                      <span className="truncate">{match.betType}</span>
                                </span>
                                
                                {/* Status Badge */}
                                  {match.status === 'WON' ? (
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-green-500/15 border border-green-500/40 backdrop-blur-sm whitespace-nowrap">
                                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-[10px] sm:text-xs font-medium text-green-300">Won</span>
                                      {match.result && (
                                        <span className="text-[9px] sm:text-[10px] text-green-400/80 ml-1">({match.result})</span>
                                      )}
                                    </div>
                                  ) : match.status === 'FAILED' ? (
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 backdrop-blur-sm whitespace-nowrap">
                                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-[10px] sm:text-xs font-medium text-red-300">Failed</span>
                                      {match.result && (
                                        <span className="text-[9px] sm:text-[10px] text-red-400/80 ml-1">({match.result})</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/8 border border-white/20 backdrop-blur-sm whitespace-nowrap">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse flex-shrink-0" />
                                      <span className="text-[10px] sm:text-xs font-medium text-white/70">Pending</span>
                                    </div>
                                  )}
                                  </div>
                                </div>

                                {/* Additional Info Row */}
                                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs text-white/50">
                                  {match.confidence && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white/40">Confidence:</span>
                                      <span className="text-[rgb(var(--brand-yellow))] font-medium">
                                        {typeof match.confidence === 'string' ? match.confidence.replace(/\s*\([^)]*\)/g, '') : match.confidence}
                                      </span>
                                    </div>
                                  )}
                                  {match.overOdds && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white/40">Odds:</span>
                                      <span className="text-white/70 font-medium">{match.overOdds}</span>
                                    </div>
                                  )}
                                  {match.result && match.status !== 'PENDING' && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white/40">Result:</span>
                                      <span className={`font-medium ${match.status === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
                                        {match.result}
                                      </span>
                                    </div>
                                  )}
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
    </div>
  );
}
