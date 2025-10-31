import fs from 'fs';
import path from 'path';

export interface MatchItem {
  id: string;
  sport?: string | null;
  league?: string | null;
  home?: { name: string };
  away?: { name: string };
  status?: string;
  timeLabel?: string | null;
  startTime?: string | null; // ISO string if available
  videoSrc?: string;
}

// Read matches from local JSON file
const UNIFIED_MATCHES_PATH = path.join(process.cwd(), 'data', 'unified_matches.json');

export async function readUnifiedMatches(): Promise<MatchItem[]> {
  try {
    const raw = fs.readFileSync(UNIFIED_MATCHES_PATH, 'utf8');
    return JSON.parse(raw) as MatchItem[];
  } catch {
    return [];
  }
}

