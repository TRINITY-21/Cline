import type { Sport, UnifiedMatch } from './types';

const STREAMED_API_BASE = 'https://streamed.pk/api';

/**
 * Streamed API match structure (as returned from the API)
 */
export interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: string | number; // Can be ISO string or timestamp (milliseconds)
  poster?: string;
  popular?: boolean;
  teams?: {
    home?: {
      id?: string;
      name?: string;
      badge?: string;
    };
    away?: {
      id?: string;
      name?: string;
      badge?: string;
    };
  };
  sources?: Array<{
    source?: string;
    id?: string;
  }>;
}

/**
 * Streamed API stream response
 */
export interface StreamedStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}

/**
 * Map Streamed API category to our Sport type
 * Note: NFL is kept separate for filtering purposes
 */
function mapCategoryToSport(category: string): Sport {
  const catLower = category.toLowerCase();
  if (catLower.includes('hockey') || catLower.includes('ice hockey')) {
    return 'Hockey';
  }
  if (catLower.includes('basketball') || catLower.includes('nba')) {
    return 'Basketball';
  }
  if (catLower.includes('volleyball')) {
    return 'Volleyball';
  }
  if (catLower.includes('tennis')) {
    return 'Tennis';
  }
  // Default to Football (handles both football and american-football)
  // The categoryTag will differentiate them for filtering
  return 'Football';
}

/**
 * Get display category tag from API category
 */
function getCategoryTag(category: string): string {
  const catLower = category.toLowerCase();
  
  // Handle special cases first
  if (catLower === 'american-football' || catLower.includes('american football')) {
    return 'AMERICAN-FOOTBALL';
  }
  if (catLower === 'football' || (catLower.includes('football') && !catLower.includes('american'))) {
    return 'FOOTBALL';
  }
  if (catLower === 'afl') {
    return 'AFL';
  }
  if (catLower === 'baseball') {
    return 'BASEBALL';
  }
  if (catLower === 'basketball') {
    return 'BASKETBALL';
  }
  if (catLower === 'billiards') {
    return 'BILLIARDS';
  }
  if (catLower === 'cricket') {
    return 'CRICKET';
  }
  if (catLower === 'darts') {
    return 'DARTS';
  }
  if (catLower === 'fight' || catLower.includes('fight')) {
    return 'FIGHT';
  }
  if (catLower === 'golf') {
    return 'GOLF';
  }
  if (catLower === 'hockey' || catLower.includes('ice hockey')) {
    return 'HOCKEY';
  }
  if (catLower === 'motor-sports' || catLower === 'motor sports' || catLower.includes('motor')) {
    return 'MOTOR-SPORTS';
  }
  if (catLower === 'rugby') {
    return 'RUGBY';
  }
  if (catLower === 'tennis') {
    return 'TENNIS';
  }
  if (catLower === 'volleyball') {
    return 'VOLLEYBALL';
  }
  
  // Return uppercase version of category for others
  return category.toUpperCase().replace(/-/g, '-');
}

/**
 * Map category tag to display name
 */
export function getCategoryDisplayName(categoryTag: string): string {
  const tagUpper = categoryTag.toUpperCase();
  
  // Handle American Football variations
  if (tagUpper === 'AMERICAN-FOOTBALL' || tagUpper.includes('AMERICAN FOOTBALL') || tagUpper === 'AMERICANFOOTBALL') {
    return 'NFL';
  }
  
  const displayNames: Record<string, string> = {
    'FOOTBALL': 'Football',
    'AMERICAN-FOOTBALL': 'NFL',
    'AFL': 'AFL',
    'BASEBALL': 'Baseball',
    'BASKETBALL': 'Basketball',
    'BILLIARDS': 'Billiards',
    'CRICKET': 'Cricket',
    'DARTS': 'Darts',
    'FIGHT': 'Fight',
    'GOLF': 'Golf',
    'HOCKEY': 'Hockey',
    'MOTOR-SPORTS': 'Motor Sports',
    'RUGBY': 'Rugby',
    'TENNIS': 'Tennis',
    'VOLLEYBALL': 'Volleyball',
  };
  
  const displayName = displayNames[tagUpper];
  if (displayName) return displayName;
  
  // Fallback: convert to readable format, but replace American Football with NFL
  const formatted = categoryTag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  if (formatted.toLowerCase().includes('american football')) {
    return 'NFL';
  }
  
  return formatted;
}

/**
 * Get team badge URL from Streamed API
 */
export function getTeamBadgeUrl(badgeId: string): string {
  return `${STREAMED_API_BASE}/images/badge/${badgeId}.webp`;
}

/**
 * Fetch stream URL for a match
 */
async function fetchStreamUrl(source: string, id: string): Promise<string | null> {
  try {
    const response = await fetch(`${STREAMED_API_BASE}/stream/${source}/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      return null;
    }

    const data: StreamedStream[] = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Prefer HD streams, then first available
    const hdStream = data.find(s => s.hd);
    const stream = hdStream || data[0];
    return stream.embedUrl || null;
  } catch (error) {
    return null;
  }
}

/**
 * Transform Streamed API match to UnifiedMatch format
 */
async function transformStreamedMatch(match: StreamedMatch): Promise<UnifiedMatch | null> {
  try {
    // Validate required fields
    if (!match.id || !match.category) {
      return null;
    }

    if (!match.teams?.home?.name || !match.teams?.away?.name) {
      return null;
    }

    const sport = mapCategoryToSport(match.category);

    // Get team badge URLs
    const homeBadgeUrl = match.teams.home?.badge
      ? getTeamBadgeUrl(match.teams.home.badge)
      : undefined;
    const awayBadgeUrl = match.teams.away?.badge
      ? getTeamBadgeUrl(match.teams.away.badge)
      : undefined;

    // Parse date to get time - use API date exactly as provided, no timezone conversions
    let timeLabel: string | undefined;
    let startTime: string | undefined;
    let status: 'live' | 'upcoming' | 'ended' = 'upcoming';

    try {
      if (match.date === undefined || match.date === null) {
      } else {
        // Handle both timestamp (number) and ISO string formats
        let matchDate: Date;
        
        if (typeof match.date === 'number') {
          // Date is a timestamp in milliseconds
          matchDate = new Date(match.date);
        } else if (typeof match.date === 'string') {
          // Try to parse ISO string first
          const isoTimeMatch = match.date.match(/T(\d{1,2}):(\d{2})/);
          if (isoTimeMatch) {
            // Extract hours and minutes directly from the ISO string
            const hours = String(parseInt(isoTimeMatch[1], 10)).padStart(2, '0');
            const minutes = isoTimeMatch[2];
            timeLabel = `${hours}:${minutes}`;
            matchDate = new Date(match.date);
          } else {
            // Parse as date string
            matchDate = new Date(match.date);
          }
        } else {
          matchDate = new Date(match.date);
        }

        if (!isNaN(matchDate.getTime())) {
          // If we didn't extract time from ISO string, extract from Date object
          if (!timeLabel) {
            // Use local hours/minutes - timestamps represent a moment in time,
            // and we display in user's local timezone for clarity
            const hours = String(matchDate.getHours()).padStart(2, '0');
            const minutes = String(matchDate.getMinutes()).padStart(2, '0');
            timeLabel = `${hours}:${minutes}`;
          }
          
          startTime = matchDate.toISOString();

          // Determine status based on comparing timestamps directly
          // The API date represents the actual match time
          const now = new Date();
          const twoHoursLater = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
          
          if (now < matchDate) {
            status = 'upcoming';
          } else if (now < twoHoursLater) {
            status = 'live';
          } else {
            status = 'ended';
          }
        } else {
        }
      }
    } catch {
      // Keep defaults if date parsing fails
    }

    // Fetch stream URL from first source (only fetch for live/upcoming matches)
    let videoSrc = '';
    if (match.sources && match.sources.length > 0 && status !== 'ended') {
      const firstSource = match.sources[0];
      if (firstSource?.source && firstSource?.id) {
        const streamUrl = await fetchStreamUrl(firstSource.source, firstSource.id);
        if (streamUrl) {
          videoSrc = streamUrl;
        }
      }
    }

    // Get category tag for display (to differentiate Football from NFL)
    const categoryTag = getCategoryTag(match.category);

    return {
      id: match.id,
      sport,
      league: {
        name: match.category,
      },
      home: {
        name: match.teams.home!.name!,
        logo: homeBadgeUrl,
        teamId: match.teams.home!.id,
      },
      away: {
        name: match.teams.away!.name!,
        logo: awayBadgeUrl,
        teamId: match.teams.away!.id,
      },
      status,
      timeLabel: timeLabel || undefined, // Ensure timeLabel is set
      startTime: startTime || undefined,
      videoSrc,
      today: true,
      // Store original category for display tags
      categoryTag, // Add this field to UnifiedMatch type
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch today's matches from Streamed API
 */
export async function fetchTodayMatches(): Promise<UnifiedMatch[]> {
  try {
    const response = await fetch(`${STREAMED_API_BASE}/matches/all-today`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return [];
    }

    const matches: StreamedMatch[] = await response.json();
    if (!Array.isArray(matches)) {
      return [];
    }

    // Get today's and yesterday's dates for comparison
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    
    // Calculate yesterday's date
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYear = yesterday.getFullYear();
    const yesterdayMonth = yesterday.getMonth();
    const yesterdayDay = yesterday.getDate();

    // First, identify which matches might be from yesterday (for live matches)
    // and which are from today - we'll transform all to get accurate status
    const matchesWithDates = matches.map(m => {
      if (!m.date) return { match: m, dateInfo: null };
      
      let matchDate: Date;
      if (typeof m.date === 'number') {
        matchDate = new Date(m.date);
      } else if (typeof m.date === 'string') {
        matchDate = new Date(m.date);
      } else {
        return { match: m, dateInfo: null };
      }

      if (isNaN(matchDate.getTime())) return { match: m, dateInfo: null };

      const matchYear = matchDate.getFullYear();
      const matchMonth = matchDate.getMonth();
      const matchDay = matchDate.getDate();

      const isToday = matchYear === todayYear && matchMonth === todayMonth && matchDay === todayDay;
      const isYesterday = matchYear === yesterdayYear && matchMonth === yesterdayMonth && matchDay === yesterdayDay;

      return { match: m, dateInfo: { isToday, isYesterday, date: matchDate } };
    });

    // Transform all matches to get their status
    const allTransformed = await Promise.all(
      matchesWithDates.map(({ match }) => transformStreamedMatch(match))
    );

    // Filter to include:
    // 1. Matches scheduled for today (any status)
    // 2. Matches from yesterday that are still live
    const filtered: UnifiedMatch[] = [];
    
    for (let i = 0; i < allTransformed.length; i++) {
      const match = allTransformed[i];
      const dateInfo = matchesWithDates[i].dateInfo;

      if (!match || !dateInfo) continue;

      // Include if it's today (any status)
      if (dateInfo.isToday) {
        filtered.push(match);
        continue;
      }
      
      // Include if it's from yesterday AND still live
      if (dateInfo.isYesterday && match.status === 'live') {
        filtered.push(match);
      }
    }

    return filtered;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch trending/popular matches from Streamed API
 */
export async function fetchTrendingMatches(): Promise<UnifiedMatch[]> {
  try {
    const response = await fetch(`${STREAMED_API_BASE}/matches/all/popular`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return [];
    }

    const matches: StreamedMatch[] = await response.json();
    if (!Array.isArray(matches)) {
      return [];
    }

    // Transform all matches in parallel
    const transformed = await Promise.all(
      matches.map(m => transformStreamedMatch(m))
    );

    // Filter out null results and only return non-ended matches
    return transformed
      .filter((m): m is UnifiedMatch => m !== null && m.status !== 'ended');
  } catch (error) {
    return [];
  }
}

