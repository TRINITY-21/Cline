"use client";

import { enrichGames } from '@/lib/catalog';
import { getDisplayName } from '@/lib/utils';
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
};

type Prediction = {
  gameId: string;
  predictedWinner: 'home' | 'away' | 'draw';
  confidence: number; // 1-100
  points?: number;
  predictedScore?: { home: number; away: number };
};

const DEFAULT_SRC = 'https://voodc.com/embed/1/85818c92a38e9e86847a8599a08f9887847c.html';

const MOCK_GAMES: GameItem[] = [];

const MOCK_PREDICTIONS: Prediction[] = [];

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

function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'bg-[rgb(var(--brand-yellow))]';
    if (conf >= 60) return 'bg-yellow-500';
    return 'bg-yellow-400';
  };

  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full ${getColor(confidence)} transition-all`}
        style={{ width: `${confidence}%` }}
      />
    </div>
  );
}

export default function MyPredictions() {
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/predictions', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        setEntries(Array.isArray(data) ? data : []);
      } catch {}
    })();
    return () => { cancelled = true; };
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
          status: src?.status || null, // Include status from API
        } as any,
        msbs: src?.msbs,
        msbsWinner: src?.msbsWinner,
      };
    });
  }, [enrichedGames, entries]);

  const totalPoints = useMemo(() => {
    return MOCK_PREDICTIONS.filter(p => p.points).reduce((sum, p) => sum + (p.points || 0), 0);
  }, []);

  // Calculate stats from actual predictions data
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

  // Group predictions by league for accordion
  const groupedByLeague = useMemo(() => {
    const groups: Record<string, any[]> = {};
    gamesWithPredictions.forEach(entry => {
      const key = entry.game.league || entry.game.sport;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [gamesWithPredictions]);

  const leagueKeys = useMemo(() => Object.keys(groupedByLeague).sort(), [groupedByLeague]);

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    if (leagueKeys[0]) defaults[leagueKeys[0]] = true;
    setExpandedKeys(prev => ({ ...defaults, ...prev }));
  }, [leagueKeys.join('|')]);

  function toggleKey(key: string, value?: boolean) {
    setExpandedKeys(prev => ({ ...prev, [key]: value ?? !prev[key] }));
  }
  function expandAll() {
    const next: Record<string, boolean> = {};
    leagueKeys.forEach(k => next[k] = true);
    setExpandedKeys(next);
  }
  function collapseAll() {
    const next: Record<string, boolean> = {};
    leagueKeys.forEach(k => next[k] = false);
    setExpandedKeys(next);
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface p-4">
          <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Number of Matches</div>
          <div className="text-2xl font-bold">{stats.totalMatches}</div>
        </div>
        <div className="surface p-4">
          <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Played</div>
          <div className="text-2xl font-bold text-[rgb(var(--brand-yellow))]">{stats.played}</div>
        </div>
        <div className="surface p-4">
          <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Success</div>
          <div className="text-2xl font-bold">{stats.successRate}%</div>
        </div>
      </div>

      {/* Filters removed: always showing all predictions */}

      {/* Sticky chips to jump to leagues */}
      <div className="sticky-rail -mx-4 px-4 py-2 relative">
        <div className="fade-left"></div>
        <div className="fade-right"></div>
        <div className="flex items-center gap-2">
          {/* Middle scrollable chips */}
          <div className="flex-1 scroll-x-only no-scrollbar">
            <div className="flex items-center gap-2 w-max">
              {leagueKeys.map(k => (
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
        <div className="space-y-6">
          {leagueKeys.map((league) => {
            const entries = groupedByLeague[league] || [];
            const isOpen = !!expandedKeys[league];
            return (
            <div key={league} className="space-y-3" ref={el => { groupRefs.current[league] = el; }}>
              <button onClick={() => toggleKey(league)} className="w-full flex items-center gap-3 group">
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">{league}</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                <span className="text-xs text-white/50 mr-2">{entries.length} {entries.length === 1 ? 'match' : 'matches'}</span>
                <span className={"text-xs text-white/70 transition-transform " + (isOpen ? 'rotate-90' : '')}>›</span>
              </button>

              {isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {entries.map(({ game, prediction, msbs, msbsWinner }) => {
            const predictedTeam = prediction.predictedWinner === 'home' ? game.home : game.away;
            const predictedTeamLogo = prediction.predictedWinner === 'home' ? game.home.logo : game.away.logo;
            const predictedTeamName = prediction.predictedWinner === 'home' ? game.home.name : game.away.name;
            
            // Determine status colors
            const predictionStatus = prediction?.status;
            const isWon = predictionStatus === 'won';
            const isFailed = predictionStatus === 'failed';
            
            // Get winner name for display
            const winnerName = msbsWinner || (isWon ? predictedTeamName : '');
            
            return (
              <div
                key={game.sport + '-' + game.home.name}
                className={`text-left group rounded-lg overflow-hidden transition-all ${
                  isWon
                    ? 'border-2 border-green-500 bg-green-500/10'
                    : isFailed
                    ? 'border-2 border-red-500 bg-red-500/10'
                    : 'border border-white/10 bg-white/5'
                }`}
              >
                <div className="p-2 space-y-1.5 relative">
                  {/* Start time at top right - plain text */}
                  {game.time && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] text-white/60 font-mono">
                        {game.time}
                      </span>
                    </div>
                  )}
                  <div className="text-[9px] text-white/50 uppercase tracking-wide leading-tight">{game.league}</div>

                  {/* Match Info */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div className="duel-pedestal w-8 h-8 grid place-items-center overflow-hidden shrink-0">
                        <TeamLogo logo={game.home.logo} name={game.home.name} size={28} />
                        <div className="duel-gloss" />
                      </div>
                      <div className="font-semibold text-[10px] truncate max-w-[5rem] text-center leading-tight" title={game.home.name}>{getDisplayName(game.home.name)}</div>
                    </div>

                    <span className="text-white/40 text-[9px] font-bold">VS</span>

                    <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div className="duel-pedestal w-8 h-8 grid place-items-center overflow-hidden shrink-0">
                        <TeamLogo logo={game.away.logo} name={game.away.name} size={28} />
                        <div className="duel-gloss" />
                      </div>
                      <div className="font-semibold text-[10px] truncate max-w-[5rem] text-center leading-tight" title={game.away.name}>{getDisplayName(game.away.name)}</div>
                    </div>
                  </div>

                  {/* MSBS from Betistuta */}
                  <div className="pt-0.5 border-t border-white/10">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-2">
                        <span className="pill pill-active !text-[10px] !px-2 !py-0.5" title="Prediction">
                          {msbs ? `Pred: ${msbs}` : '(Pred—)'}
                        </span>
                      </div>
                      {isWon && winnerName && (
                        <div className="text-[11px] font-semibold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                          {getDisplayName(winnerName)} wins ✓
                        </div>
                      )}
                      {isFailed && (
                        <div className="text-[11px] font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                          Prediction failed ✗
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

      <PlayerOverlay
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.home} vs ${selected.away} • ${selected.league}` : ''}
        src={selected?.videoSrc || DEFAULT_SRC}
      />
    </div>
  );
}

