import catalog from '@/data/teams.json';
import type { EnrichedGame, EnrichedTeam, ScrapedGame, Sport, TeamCatalogItem } from '@/lib/types';

export const TEAM_CATALOG: TeamCatalogItem[] = catalog as unknown as TeamCatalogItem[];

export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/fc|cf|sc|bc|ac|\bclub\b|\bthe\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findTeamByName(name: string, sport?: Sport): TeamCatalogItem | undefined {
  const n = normalizeName(name);
  // Exact by name
  const exact = TEAM_CATALOG.find(t => (!sport || t.sport === sport) && normalizeName(t.name) === n);
  if (exact) return exact;
  // Alias exact
  for (const t of TEAM_CATALOG) {
    if (sport && t.sport !== sport) continue;
    const aliases = (t.aliases || []).map(a => normalizeName(a));
    if (aliases.includes(n)) return t;
  }
  // Loose contains ("barca" in "fc barcelona")
  for (const t of TEAM_CATALOG) {
    if (sport && t.sport !== sport) continue;
    const base = normalizeName(t.name);
    if (base.includes(n) || n.includes(base)) return t;
  }
  return undefined;
}

export function enrichGameFromCatalog(game: ScrapedGame): EnrichedGame {
  const homeMatch = findTeamByName(game.home, game.sport);
  const awayMatch = findTeamByName(game.away, game.sport);

  const home: EnrichedTeam = {
    name: game.home,
    logo: homeMatch?.logo,
    matchedCatalogId: homeMatch?.id
  };
  const away: EnrichedTeam = {
    name: game.away,
    logo: awayMatch?.logo,
    matchedCatalogId: awayMatch?.id
  };

  return {
    sport: game.sport,
    league: game.league,
    videoSrc: game.videoSrc,
    time: game.time,
    home,
    away
  };
}

export function enrichGames(games: ScrapedGame[]): EnrichedGame[] {
  return games.map(enrichGameFromCatalog);
}


