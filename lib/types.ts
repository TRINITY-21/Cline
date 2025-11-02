export type ProviderItem = {
  id: string;
  name: string;
  url: string;
};

export type PageMetadata = {
  url: string;
  canFrame: boolean;
  frameBlockedBy?: 'x-frame-options' | 'csp';
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};


export type Sport = 'Football' | 'Hockey' | 'Volleyball' | 'Basketball' | 'Tennis';

export type TeamCatalogItem = {
  id: string;
  sport: Sport;
  name: string;
  aliases?: string[];
  logo: string; // URL to team badge/logo
};

export type ScrapedGame = {
  sport: Sport;
  league?: string;
  home: string;
  away: string;
  videoSrc: string; // iframe/page you scraped
  time?: string;
};

export type EnrichedTeam = {
  name: string;
  logo?: string;
  matchedCatalogId?: string;
};

export type EnrichedGame = Omit<ScrapedGame, 'home' | 'away'> & {
  home: EnrichedTeam;
  away: EnrichedTeam;
  matchId?: string; // optional, used for API polling for videoSrc
  poster?: string; // match poster image URL
};

export type LeagueCatalogItem = {
  id: string;
  name: string;
  aliases?: string[];
  logo: string;
};


// A comprehensive match shape suitable for storage (e.g., Firestore)
export type UnifiedMatch = {
  id: string; // deterministic id if possible, otherwise uuid
  sport: Sport;
  league?: {
    name: string;
    id?: string;
    logo?: string;
  };
  home: {
    name: string;
    logo?: string;
    teamId?: string;
    score?: number; // optional when scraping doesn't provide
  };
  away: {
    name: string;
    logo?: string;
    teamId?: string;
    score?: number; // optional when scraping doesn't provide
  };
  status: 'live' | 'upcoming' | 'ended';
  // Original time label (e.g., "Today • 19:45", "Live Now") plus parsed fields
  timeLabel?: string;
  startTime?: string; // ISO when known or HH:MM when only time-of-day is known
  // Streaming/source info
  videoSrc: string;
  // Match poster image URL
  poster?: string;
  // Category tag for display (e.g., "FOOTBALL", "AMERICAN-FOOTBALL")
  categoryTag?: string;
  // Whether this match belongs to today's schedule at scrape time
  today?: boolean;
  // Provider/page metadata if available
  page?: PageMetadata;
  // Timestamps for storage
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};

