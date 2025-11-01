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

/**
 * Check if a logo URL is from dasfootball.com (basfootball)
 */
function isDasfootballLogo(logoUrl: string | undefined | null): boolean {
  if (!logoUrl) return false;
  return logoUrl.includes('dasfootball.com');
}

/**
 * Check if a logo is a valid dasfootball logo
 * Only dasfootball.com logos are accepted - no local /logos/ or other sources
 */
function isValidTeamLogo(logoUrl: string | undefined | null): boolean {
  if (!logoUrl) return false;
  // Only accept dasfootball.com logos
  return isDasfootballLogo(logoUrl);
}

export function enrichGameFromCatalog(game: ScrapedGame & { homeLogo?: string; awayLogo?: string }): EnrichedGame {
  const homeMatch = findTeamByName(game.home, game.sport);
  const awayMatch = findTeamByName(game.away, game.sport);

  // Logo priority: 1. Catalog logo from teams.json (if valid dasfootball or local), 2. API logo (if valid dasfootball or local)
  // Reject any logos that aren't from dasfootball.com or local /logos/ directory
  // This prevents league logos, Wikipedia logos, and other non-team logos from being used
  const homeCatalogLogo = homeMatch?.logo;
  const homeApiLogo = game.homeLogo;
  
  const homeLogo = isValidTeamLogo(homeCatalogLogo)
    ? homeCatalogLogo
    : (isValidTeamLogo(homeApiLogo) ? homeApiLogo : undefined);
  
  const awayCatalogLogo = awayMatch?.logo;
  const awayApiLogo = game.awayLogo;
  
  const awayLogo = isValidTeamLogo(awayCatalogLogo)
    ? awayCatalogLogo
    : (isValidTeamLogo(awayApiLogo) ? awayApiLogo : undefined);

  const home: EnrichedTeam = {
    name: game.home,
    logo: homeLogo,
    matchedCatalogId: homeMatch?.id
  };
  const away: EnrichedTeam = {
    name: game.away,
    logo: awayLogo,
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


