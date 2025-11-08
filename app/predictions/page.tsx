"use client";

import { getDisplayName } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

type Match = {
  id: string;
  home: string;
  away: string;
  time: string;
  league: string;
  pattern: string;
  bet: string;
  betType: 'Over 1.5 Goals' | 'Over 2.5 Goals';
  confidence: string;
  ms1: string;
  ms0: string;
  ms2: string;
  result?: string;
  status: 'PENDING' | 'WON' | 'FAILED';
  category: 'PERFECT' | 'NEAR-PERFECT' | 'STRONG_FAVORITE';
};

// Static data from markdown - all matches are Over 2.5 Goals
const PREDICTIONS_DATA: Match[] = [
  // Perfect Pattern Matches - Over 2.5 Goals
  {
    id: '1',
    home: 'Nomme JK Kalju',
    away: 'Paide Linnameeskond',
    time: '13:30',
    league: 'Estonya-Premium Lig',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.29',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '2.12',
    ms0: '3.18',
    ms2: '2.33',
    result: 'Nomme JK Kalju v Paide Linnameeskond',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '4',
    home: 'Rijnsburgse Boys',
    away: 'Katwijk',
    time: '15:30',
    league: 'Hollanda-Tweede Divisie',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.3',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.8',
    ms0: '3.35',
    ms2: '2.77',
    result: 'Rijnsburgse Boys v Katwijk',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '5',
    home: 'Eintracht Trier',
    away: 'Bahlinger SC',
    time: '16:00',
    league: 'Almanya-Bölgesel Lig Güney Bati',
    pattern: 'BTTS Yes @ 2.25',
    bet: 'Over 1.5 Goals @ 2.24',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.25',
    ms0: '4.62',
    ms2: '5.12',
    result: 'Eintracht Trier v Bahlinger SC',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '6',
    home: 'Lehnerz',
    away: 'Sonnenhof Grossaspach',
    time: '16:00',
    league: 'Almanya-Bölgesel Lig Güney Bati',
    pattern: 'BTTS Yes @ 2.46',
    bet: 'Over 1.5 Goals @ 2.45',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '2.65',
    ms0: '3.46',
    ms2: '1.82',
    result: 'Lehnerz v Sonnenhof Grossaspach',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '7',
    home: 'Newcastle United U21',
    away: 'Burnley U21',
    time: '16:00',
    league: 'Ingiltere-Premier Lig 2',
    pattern: 'BTTS Yes @ 2.58',
    bet: 'Over 1.5 Goals @ 2.58',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.65',
    ms0: '3.66',
    ms2: '2.98',
    result: 'Newcastle United U21 v Burnley U21',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '8',
    home: 'Young Boys II',
    away: 'Cham',
    time: '16:00',
    league: 'Isviçre-1.Lig Promotion',
    pattern: 'BTTS Yes @ 2.41',
    bet: 'Over 1.5 Goals @ 2.41',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.92',
    ms0: '3.34',
    ms2: '2.53',
    result: 'Young Boys II v Cham',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '9',
    home: 'Sarpsborg 08',
    away: 'Fredrikstad',
    time: '16:00',
    league: 'Norveç-Eliteserien',
    pattern: 'BTTS Yes @ 2.25',
    bet: 'Over 1.5 Goals @ 2.24',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '2.02',
    ms0: '3.37',
    ms2: '2.58',
    result: 'Sarpsborg 08 v Fredrikstad',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '11',
    home: 'Holywell',
    away: 'Buckley Town',
    time: '17:00',
    league: 'Galler-FAW Championship Kuzey',
    pattern: 'BTTS Yes @ 2.25',
    bet: 'Over 1.5 Goals @ 2.24',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.33',
    ms0: '4.3',
    ms2: '4.34',
    result: 'Holywell v Buckley Town',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '12',
    home: 'Brentford U21',
    away: 'Watford U21',
    time: '17:00',
    league: 'Ingiltere-Professional Development Lig',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.29',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.12',
    ms0: '5.87',
    ms2: '6.7',
    result: 'Brentford U21 v Watford U21',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '15',
    home: 'Basel II',
    away: 'Breitenrain',
    time: '17:30',
    league: 'Isviçre-1.Lig Promotion',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.29',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.6',
    ms0: '3.51',
    ms2: '3.3',
    result: 'Basel II v Breitenrain',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '16',
    home: 'Umm Salal',
    away: 'Al Sadd',
    time: '17:30',
    league: 'Katar-Yildizlar Ligi',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.29',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.6',
    ms0: '3.51',
    ms2: '3.3',
    result: '',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '19',
    home: 'Morecambe',
    away: 'Sutton United',
    time: '18:00',
    league: 'Ingiltere-Ulusal Lig',
    pattern: 'BTTS Yes @ 2.25',
    bet: 'Over 1.5 Goals @ 2.26',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '2.02',
    ms0: '3.29',
    ms2: '2.39',
    result: 'Morecambe v Sutton United',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '20',
    home: 'Bedford Town',
    away: 'Merthyr Town',
    time: '18:00',
    league: 'Ingiltere-Ulusal Lig N / S Kuzey',
    pattern: 'BTTS Yes @ 2.25',
    bet: 'Over 1.5 Goals @ 2.25',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.95',
    ms0: '3.31',
    ms2: '2.5',
    result: 'Bedford Town v Merthyr Town',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '21',
    home: 'Lilleström',
    away: 'Stabaek',
    time: '18:00',
    league: 'Norveç-1.Lig',
    pattern: 'Over 2.5 Goals @ 1.15',
    bet: 'Over 2.5 Goals @ 1.15',
    betType: 'Over 2.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.1',
    ms0: '5.58',
    ms2: '7.97',
    result: 'Lilleström v Stabaek',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '23',
    home: 'Zürich',
    away: 'Luzern',
    time: '20:00',
    league: 'Isviçre-Süper Lig',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.29',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '2.04',
    ms0: '3.35',
    ms2: '2.55',
    result: 'Zürich v Luzern',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '24',
    home: 'Servette',
    away: 'Thun',
    time: '22:30',
    league: 'Isviçre-Süper Lig',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.3',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.86',
    ms0: '3.4',
    ms2: '2.87',
    result: 'Servette v Thun',
    status: 'PENDING',
    category: 'PERFECT',
  },
  {
    id: '25',
    home: 'Monaco',
    away: 'Lens',
    time: '23:05',
    league: 'Fransa-Ligue 1',
    pattern: 'BTTS Yes @ 2.30',
    bet: 'Over 1.5 Goals @ 2.3',
    betType: 'Over 1.5 Goals',
    confidence: 'Very High (100% historical)',
    ms1: '1.85',
    ms0: '3.42',
    ms2: '2.89',
    result: 'Monaco v Lens',
    status: 'PENDING',
    category: 'PERFECT',
  },
];

// Get day of week from date string (DD-MM-YYYY format)
function getDayOfWeek(dateStr: string): string {
  const [day, month, year] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Group matches by day of week (all matches are on 08-11-2025)
function groupMatchesByDay(matches: Match[]): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {};
  const dateStr = '08-11-2025'; // All matches are on this date
  const dayName = getDayOfWeek(dateStr);
  
  if (!grouped[dayName]) {
    grouped[dayName] = [];
  }
  
  matches.forEach(match => {
    grouped[dayName].push(match);
  });
  
  // Sort matches by time
  Object.keys(grouped).forEach(dayKey => {
    grouped[dayKey].sort((a, b) => a.time.localeCompare(b.time));
  });
  
  return grouped;
}

export default function PredictionsPage() {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Over 1.5 Goals' | 'Over 2.5 Goals'>('all');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter matches based on selected filter
  const filteredMatches = useMemo(() => {
    if (selectedFilter === 'all') {
      return PREDICTIONS_DATA;
    }
    return PREDICTIONS_DATA.filter(m => m.betType === selectedFilter);
  }, [selectedFilter]);

  // Group matches by day
  const groupedByDay = useMemo(() => {
    return groupMatchesByDay(filteredMatches);
  }, [filteredMatches]);

  const dayKeys = useMemo(() => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDays = Object.keys(groupedByDay);
    const orderedDays = dayOrder.filter(day => availableDays.includes(day));
    const remainingDays = availableDays.filter(day => !dayOrder.includes(day));
    return [...orderedDays, ...remainingDays];
  }, [groupedByDay]);

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 sm:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Total Matches</div>
              <div className="text-2xl sm:text-3xl font-bold text-[rgb(var(--brand-yellow))]">{stats.totalMatches}</div>
            </div>
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 sm:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Over 1.5 Goals</div>
              <div className="text-2xl sm:text-3xl font-bold text-white/95">{stats.over15Matches}</div>
            </div>
            <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 sm:p-5 group hover:border-white/[0.15] transition-all">
              <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wide mb-1">Over 2.5 Goals</div>
              <div className="text-2xl sm:text-3xl font-bold text-white/95">{stats.over25Matches}</div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
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

          {/* Desktop Sticky chips to jump to days */}
          <div className="hidden lg:block sticky-rail -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 relative mb-6">
            <div className="fade-left"></div>
            <div className="fade-right"></div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex-1 scroll-x-only no-scrollbar min-w-0">
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
                <button className="pill pill-muted touch-manipulation min-h-[32px] text-[10px] sm:text-xs whitespace-nowrap" onClick={expandAll}>Expand</button>
                <button className="pill pill-muted touch-manipulation min-h-[32px] text-[10px] sm:text-xs whitespace-nowrap" onClick={collapseAll}>Collapse</button>
              </div>
            </div>
          </div>

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <p>No matches found for the selected filter</p>
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
                                      <span className="text-[10px] sm:text-xs font-mono font-medium">{match.time}</span>
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
                                  <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/8 border border-white/20 backdrop-blur-sm whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-medium text-white/70">Pending</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Info Row */}
                                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs text-white/50">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/40">Confidence:</span>
                                    <span className="text-[rgb(var(--brand-yellow))] font-medium">{match.confidence.replace(/\s*\([^)]*\)/g, '')}</span>
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
    </div>
  );
}
