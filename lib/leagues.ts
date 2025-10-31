import leagueCatalog from '@/data/leagues.json';
import { normalizeName } from '@/lib/catalog';
import { LeagueCatalogItem } from '@/lib/types';

export const LEAGUE_CATALOG: LeagueCatalogItem[] = leagueCatalog as unknown as LeagueCatalogItem[];

export function findLeagueByName(name?: string): LeagueCatalogItem | undefined {
  if (!name) return undefined;
  const n = normalizeName(name);
  const exact = LEAGUE_CATALOG.find(l => normalizeName(l.name) === n);
  if (exact) return exact;
  for (const l of LEAGUE_CATALOG) {
    const aliases = (l.aliases || []).map(a => normalizeName(a));
    if (aliases.includes(n)) return l;
  }
  for (const l of LEAGUE_CATALOG) {
    const base = normalizeName(l.name);
    if (base.includes(n) || n.includes(base)) return l;
  }
  return undefined;
}


