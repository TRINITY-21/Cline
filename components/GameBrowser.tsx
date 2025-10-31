"use client";

import { enrichGames } from '@/lib/catalog';
import type { EnrichedGame } from '@/lib/types';
import { firstNameOf, getDisplayName, statusFromLiveWindow } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import AvatarFallback from './AvatarFallback';
import PlayerOverlay from './PlayerOverlay';

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

const DEFAULT_SRC = 'https://voodc.com/embed/1/85818c92a38e9e86847a8599a08f9887847c.html';

const MOCK_GAMES: GameItem[] = [];

export default function GameBrowser() {
  const [activeSport, setActiveSport] = useState<Sport>('Football');
  const [selected, setSelected] = useState<GameItem | null>(null);
  const [fetched, setFetched] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch only trending matches (isTrending == true)
        const res = await fetch('/api/trending', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        setFetched(Array.isArray(data) ? data : []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const sports = useMemo(() => ['Football', 'Hockey', 'Volleyball', 'Basketball', 'Tennis'] as Sport[], []);
  const games = useMemo<EnrichedGame[]>(() => {
    const source = (fetched.length ? fetched : []).filter(m => m.sport === activeSport);
    const limited = source.slice(0, 6);
    return enrichGames(
      limited.map((m: any) => ({
        sport: m.sport,
        league: m.league?.name,
        home: m.home?.name,
        away: m.away?.name,
        videoSrc: m.videoSrc || '',
        time: m.timeLabel || '',
      }))
    );
  }, [activeSport, fetched]);

  // Live detection: if we have a video source, consider it live

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setActiveSport(s)}
            className={"pill " + (s === activeSport ? 'pill-active' : 'pill-muted')}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {games.map((game, i) => {
          const windowStatus = statusFromLiveWindow(game.time || '', 120);
          const isLive = windowStatus === 'live' && !!game.videoSrc;
          const isClickable = isLive;
          const disabledLabel = windowStatus === 'ended' ? 'Ended' : 'Not started';
          return (
          <div
            key={`${activeSport}-${i}`}
            title={`${game.home.name} vs ${game.away.name}`}
            className={
              "text-left group rounded-xl overflow-hidden border border-white/10 bg-white/5 transition-colors " +
              (isClickable ? "hover:bg-white/10 hover:border-white/20" : "cursor-not-allowed pointer-events-none")
            }
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
              
              <div className="absolute left-2 top-2 pill pill-active text-[10px]">{game.time || ''}</div>
            </div>
            <div className="p-4">
              <div className="text-xs text-white/60 mb-2">{game.league}</div>
              <div className="font-semibold flex items-center gap-2 mb-3">
                <span className="pill pill-active !text-[10px] inline-flex items-center gap-2 max-w-[10rem]">
                  <TeamLogo logo={game.home.logo} name={firstNameOf(game.home.name)} size={16} />
                  <span className="truncate" title={game.home.name}>{getDisplayName(game.home.name)}</span>
                </span>
                <span className="text-white/50">vs</span>
                <span className="pill pill-active !text-[10px] inline-flex items-center gap-2 max-w-[10rem]">
                  <TeamLogo logo={game.away.logo} name={firstNameOf(game.away.name)} size={16} />
                  <span className="truncate" title={game.away.name}>{getDisplayName(game.away.name)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLive ? (
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-1.5 text-xs"
                    onClick={() =>
                      setSelected({
                        id: Math.random().toString(36).slice(2),
                        sport: activeSport,
                        league: game.league || '',
                        home: game.home.name,
                        away: game.away.name,
                        time: game.time || '',
                        videoSrc: game.videoSrc
                      })
                    }
                  >
                    Watch Live
                  </button>
                ) : (
                  <span className="btn btn-ghost opacity-50 cursor-not-allowed px-3 py-1.5 text-xs">{disabledLabel}</span>
                )}
              </div>
            </div>
          </div>
        );})}
      </div>

      <PlayerOverlay
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.home} vs ${selected.away} • ${selected.league}` : ''}
        src={selected?.videoSrc || DEFAULT_SRC}
      />
    </div>
  );
}


