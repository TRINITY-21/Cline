/**
 * Favorites/Follow System
 * localStorage-based team following system
 */

const FAVORITES_STORAGE_KEY = 'favorite_teams';

export interface FavoriteTeam {
  name: string;
  logo?: string;
  sport?: string;
  addedAt: string; // ISO timestamp
}

/**
 * Get all favorite teams from localStorage
 */
export function getFavoriteTeams(): FavoriteTeam[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save favorite teams to localStorage
 */
export function saveFavoriteTeams(teams: FavoriteTeam[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(teams));
    // Trigger custom event for other components to listen
    window.dispatchEvent(new CustomEvent('favoritesUpdated'));
  } catch (error) {
    console.error('Failed to save favorite teams:', error);
  }
}

/**
 * Add a team to favorites
 */
export function addFavoriteTeam(team: Omit<FavoriteTeam, 'addedAt'>): void {
  const teams = getFavoriteTeams();
  
  // Check if team already exists (by name, case-insensitive)
  const exists = teams.some(
    t => t.name.toLowerCase() === team.name.toLowerCase()
  );
  
  if (!exists) {
    const newTeam: FavoriteTeam = {
      ...team,
      addedAt: new Date().toISOString(),
    };
    teams.push(newTeam);
    saveFavoriteTeams(teams);
  }
}

/**
 * Remove a team from favorites
 */
export function removeFavoriteTeam(teamName: string): void {
  const teams = getFavoriteTeams();
  const filtered = teams.filter(
    t => t.name.toLowerCase() !== teamName.toLowerCase()
  );
  saveFavoriteTeams(filtered);
}

/**
 * Check if a team is favorited
 */
export function isFavoriteTeam(teamName: string): boolean {
  const teams = getFavoriteTeams();
  return teams.some(
    t => t.name.toLowerCase() === teamName.toLowerCase()
  );
}

/**
 * Toggle favorite status of a team
 */
export function toggleFavoriteTeam(team: Omit<FavoriteTeam, 'addedAt'>): boolean {
  const isFavorited = isFavoriteTeam(team.name);
  
  if (isFavorited) {
    removeFavoriteTeam(team.name);
    return false;
  } else {
    addFavoriteTeam(team);
    return true;
  }
}

/**
 * Get favorite team names as a Set for quick lookup
 */
export function getFavoriteTeamNames(): Set<string> {
  const teams = getFavoriteTeams();
  return new Set(teams.map(t => t.name.toLowerCase()));
}

