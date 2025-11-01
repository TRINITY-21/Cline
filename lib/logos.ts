import catalog from '@/data/teams.json';
import type { TeamCatalogItem } from '@/lib/types';
import type { CSSProperties } from 'react';

/**
 * Get all logo URLs from the team catalog
 */
export function getAllLogoUrls(): string[] {
  const teams = catalog as unknown as TeamCatalogItem[];
  return teams
    .map(team => team.logo)
    .filter((logo): logo is string => Boolean(logo && typeof logo === 'string'));
}

/**
 * Dark mode filter styles for logos
 * Converts logos to dark variants suitable for dark backgrounds
 */
export const DARK_MODE_LOGO_FILTERS = {
  // For crest-style logos (complex with text like Everton, Dortmund)
  crest: {
    filter: 'grayscale(100%) brightness(0.4) contrast(1.1) invert(0)',
    mixBlendMode: 'lighten' as const,
  },
  // For simple/avatar-style logos (like Tottenham)
  simple: {
    filter: 'grayscale(100%) brightness(0.5) contrast(1) invert(0)',
    mixBlendMode: 'lighten' as const,
  },
} as const;

/**
 * Get dark mode filter style for a logo based on its type
 */
export function getDarkModeFilter(isCrest: boolean): CSSProperties {
  const style = isCrest ? DARK_MODE_LOGO_FILTERS.crest : DARK_MODE_LOGO_FILTERS.simple;
  return {
    filter: style.filter,
    mixBlendMode: style.mixBlendMode,
  };
}

