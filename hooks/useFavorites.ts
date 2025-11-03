"use client";

import { type FavoriteTeam, getFavoriteTeams, isFavoriteTeam, toggleFavoriteTeam } from '@/lib/favorites';
import { useEffect, useState } from 'react';

/**
 * React hook for managing favorite teams
 * Provides reactive state that updates when favorites change
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [favoriteTeamNames, setFavoriteTeamNames] = useState<Set<string>>(new Set());

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = () => {
      const teams = getFavoriteTeams();
      setFavorites(teams);
      setFavoriteTeamNames(new Set(teams.map(t => t.name.toLowerCase())));
    };

    loadFavorites();

    // Listen for favorites updates from other components
    const handleFavoritesUpdate = () => {
      loadFavorites();
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, []);

  const toggleFavorite = (team: Omit<FavoriteTeam, 'addedAt'>) => {
    const isFavorited = toggleFavoriteTeam(team);
    // State will update via event listener
    return isFavorited;
  };

  const checkIsFavorite = (teamName: string): boolean => {
    return isFavoriteTeam(teamName);
  };

  return {
    favorites,
    favoriteTeamNames,
    toggleFavorite,
    checkIsFavorite,
    isFavorite: checkIsFavorite,
  };
}

