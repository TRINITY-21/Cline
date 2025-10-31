import { enrichGames } from '@/lib/catalog';
import { findLeagueByName } from '@/lib/leagues';
import type { EnrichedGame, ScrapedGame, UnifiedMatch } from '@/lib/types';
import { extractTimeLabel, getMatchStatus } from '@/lib/utils';

function safeIdPart(input?: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function deriveMatchId(game: EnrichedGame): string {
  const home = game.home.matchedCatalogId || safeIdPart(game.home.name);
  const away = game.away.matchedCatalogId || safeIdPart(game.away.name);
  const leaguePart = safeIdPart(game.league || '');
  const timePart = safeIdPart(game.time || '');
  return [home, 'vs', away, leaguePart, timePart].filter(Boolean).join('-');
}

export function buildUnifiedMatchesFromEnriched(games: EnrichedGame[]): UnifiedMatch[] {
  return games.map((g) => {
    const status = getMatchStatus(g.time || '');
    const { isLive, time } = extractTimeLabel(g.time || '');
    const leagueMeta = findLeagueByName(g.league);
    const id = deriveMatchId(g);
    return {
      id,
      sport: g.sport,
      league: g.league
        ? { name: g.league, id: leagueMeta?.id, logo: leagueMeta?.logo }
        : undefined,
      home: {
        name: g.home.name,
        logo: g.home.logo,
        teamId: g.home.matchedCatalogId,
      },
      away: {
        name: g.away.name,
        logo: g.away.logo,
        teamId: g.away.matchedCatalogId,
      },
      status,
      timeLabel: g.time,
      startTime: isLive ? undefined : time, // keep simple; can be upgraded to ISO later
      videoSrc: g.videoSrc,
      updatedAt: new Date().toISOString(),
    } satisfies UnifiedMatch;
  });
}

export function buildUnifiedMatchesFromScraped(games: ScrapedGame[]): UnifiedMatch[] {
  const enriched = enrichGames(games);
  return buildUnifiedMatchesFromEnriched(enriched);
}


