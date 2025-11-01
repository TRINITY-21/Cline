import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Import the extraction functions from the enrichment script
// (Or we'll copy them here for standalone use)

interface Player {
  number: number;
  position: string;
  name: string;
  rating?: number | null;
  captain?: boolean;
  yellowCard?: number | null;
  redCard?: number | null;
}

interface Lineup {
  formation?: string;
  players: Player[];
  substitutes: Player[];
  coach?: string;
}

interface MatchStats {
  possession?: { home: number; away: number };
  expectedGoals?: { home: number; away: number };
  attack?: Record<string, { label: string; home: string; away: string }>;
  passing?: Record<string, { label: string; home: string; away: string }>;
  discipline?: Record<string, { label: string; home: string; away: string }>;
}

interface HeadToHead {
  homeWins?: number;
  awayWins?: number;
  draws?: number;
  lastMeetings?: number;
  description?: string;
}

interface StandingsEntry {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[];
  qualificationZone?: 'champions-league' | 'europa-league' | 'relegation' | null;
}

interface TeamForm {
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[];
}

interface ScrapedMatch {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time?: string;
  score?: string;
  halftimeScore?: string;
  videoSrc?: string;
  venue?: string;
  referee?: string;
  category?: string;
  url: string;
  stage?: string;
  lineups?: {
    home?: Lineup;
    away?: Lineup;
  };
  stats?: MatchStats;
  headToHead?: HeadToHead;
  standings?: StandingsEntry[];
  teamForm?: {
    home?: TeamForm;
    away?: TeamForm;
  };
  logos?: {
    league?: string;
    homeTeam?: string;
    awayTeam?: string;
  };
}

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

export function extractLineups($: cheerio.CheerioAPI): { home?: Lineup; away?: Lineup } {
  const lineups: { home?: Lineup; away?: Lineup } = {};

  const homeLineupDiv = $('.kp-team-lineup.home').first();
  if (homeLineupDiv.length > 0) {
    const players: Player[] = [];
    const substitutes: Player[] = [];
    const formation = homeLineupDiv.find('.kp-formation').text().trim() || undefined;

    homeLineupDiv.find('.kp-players-list').first().find('.kp-player-row').each((_, el) => {
      const $player = $(el);
      const nameText = $player.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $player.find('.kp-player-position').text().trim();
      const number = parseInt($player.find('.kp-player-number').text().trim()) || 0;
      const ratingText = $player.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;
      const isCaptain = name.includes('(C)') || nameText.includes('captain');
      const cleanName = name.replace(/\s*\(C\)\s*/g, '').trim();
      const yellowCards = $player.find('.kp-event.yellow-card').length;
      const redCard = $player.find('.kp-event.red-card').length > 0;

      if (cleanName) {
        players.push({
          number,
          position,
          name: cleanName,
          rating,
          captain: isCaptain,
          yellowCard: yellowCards > 0 ? yellowCards : null,
          redCard: redCard ? 1 : null,
        });
      }
    });

    homeLineupDiv.find('.kp-subs .kp-players-list .kp-player-row').each((_, el) => {
      const $sub = $(el);
      const nameText = $sub.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $sub.find('.kp-player-position').text().trim() || 'Sub';
      const number = parseInt($sub.find('.kp-player-number').text().trim()) || 0;
      const ratingText = $sub.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;

      if (name) {
        substitutes.push({ number, position, name, rating });
      }
    });

    if (players.length > 0 || substitutes.length > 0) {
      lineups.home = { formation, players, substitutes };
    }
  }

  const awayLineupDiv = $('.kp-team-lineup.away').first();
  if (awayLineupDiv.length > 0) {
    const players: Player[] = [];
    const substitutes: Player[] = [];
    const formation = awayLineupDiv.find('.kp-formation').text().trim() || undefined;

    awayLineupDiv.find('.kp-players-list').first().find('.kp-player-row').each((_, el) => {
      const $player = $(el);
      const nameText = $player.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $player.find('.kp-player-position').text().trim();
      const number = parseInt($player.find('.kp-player-number').text().trim()) || 0;
      const ratingText = $player.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;
      const isCaptain = name.includes('(C)') || nameText.includes('captain');
      const cleanName = name.replace(/\s*\(C\)\s*/g, '').trim();
      const yellowCards = $player.find('.kp-event.yellow-card').length;
      const redCard = $player.find('.kp-event.red-card').length > 0;

      if (cleanName) {
        players.push({
          number,
          position,
          name: cleanName,
          rating,
          captain: isCaptain,
          yellowCard: yellowCards > 0 ? yellowCards : null,
          redCard: redCard ? 1 : null,
        });
      }
    });

    awayLineupDiv.find('.kp-subs .kp-players-list .kp-player-row').each((_, el) => {
      const $sub = $(el);
      const nameText = $sub.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $sub.find('.kp-player-position').text().trim() || 'Sub';
      const number = parseInt($sub.find('.kp-player-number').text().trim()) || 0;
      const ratingText = $sub.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;

      if (name) {
        substitutes.push({ number, position, name, rating });
      }
    });

    if (players.length > 0 || substitutes.length > 0) {
      lineups.away = { formation, players, substitutes };
    }
  }

  return lineups;
}

export function extractMatchStats($: cheerio.CheerioAPI): MatchStats | undefined {
  const statsDiv = $('.kop-match-stats');
  if (statsDiv.length === 0) return undefined;

  const stats: MatchStats = {};

  const possessionDiv = statsDiv.find('.possession-container');
  if (possessionDiv.length > 0) {
    const homeWidth = possessionDiv.find('.kop-stats-bar-home').attr('style');
    const homeMatch = homeWidth?.match(/width:\s*(\d+)%/);
    const home = homeMatch ? parseInt(homeMatch[1]) : 0;
    const away = 100 - home;
    if (home > 0) stats.possession = { home, away };
  }

  statsDiv.find('.stat-container').each((_, el) => {
    const $container = $(el);
    const label = $container.find('.stat-label').text().trim();
    if (label.toLowerCase().includes('expected goals') || label.toLowerCase().includes('xg')) {
      const homeValue = $container.find('.stat-value').first().text().trim();
      const awayValue = $container.find('.stat-value').last().text().trim();
      const home = parseFloat(homeValue) || 0;
      const away = parseFloat(awayValue) || 0;
      if (home >= 0 && away >= 0) stats.expectedGoals = { home, away };
    }
  });

  (['attack', 'passing', 'discipline'] as const).forEach(sectionName => {
    const sectionData: Record<string, { label: string; home: string; away: string }> = {};
    const section = statsDiv.find('.kop-stats-section').filter((_, el) => {
      return $(el).find('.kop-stats-section-title').text().trim().toLowerCase() === sectionName;
    });
    
    if (section.length > 0) {
      section.find('.stat-container').each((_, el) => {
        const $container = $(el);
        const label = $container.find('.stat-label').text().trim();
        const homeValue = $container.find('.stat-value').first().text().trim();
        const awayValue = $container.find('.stat-value').last().text().trim();
        if (label && homeValue && awayValue) {
          const statId = label.toLowerCase().replace(/\s+/g, '_');
          sectionData[statId] = {
            label,
            home: homeValue,
            away: awayValue,
          };
        }
      });
    }
    
    if (Object.keys(sectionData).length > 0) {
      stats[sectionName] = sectionData;
    }
  });

  return Object.keys(stats).length > 0 ? stats : undefined;
}

export function extractHeadToHead($: cheerio.CheerioAPI): HeadToHead | undefined {
  const h2hDiv = $('.kp-h2h-stats');
  if (h2hDiv.length === 0) return undefined;

  const h2h: HeadToHead = {};
  const homeWinsMatch = h2hDiv.text().match(/Home Wins[:\s]+(\d+)/i);
  const awayWinsMatch = h2hDiv.text().match(/Away Wins[:\s]+(\d+)/i);
  const drawsMatch = h2hDiv.text().match(/Draws[:\s]+(\d+)/i);

  if (homeWinsMatch) h2h.homeWins = parseInt(homeWinsMatch[1]) || 0;
  if (awayWinsMatch) h2h.awayWins = parseInt(awayWinsMatch[1]) || 0;
  if (drawsMatch) h2h.draws = parseInt(drawsMatch[1]) || 0;

  const lastMeetingsMatch = h2hDiv.text().match(/Last (\d+) Meetings/i);
  if (lastMeetingsMatch) h2h.lastMeetings = parseInt(lastMeetingsMatch[1]) || 0;

  const description = h2hDiv.find('p, .kp-h2h-description').text().trim();
  if (description) h2h.description = description;

  return Object.keys(h2h).length > 0 ? h2h : undefined;
}

export function extractStandings($: cheerio.CheerioAPI): StandingsEntry[] | undefined {
  const standingsDiv = $('.kp-standings-table');
  if (standingsDiv.length === 0) return undefined;

  const entries: StandingsEntry[] = [];
  // Extract all standings rows - match any row that has .kp-standings-rank (more reliable than class names)
  standingsDiv.find('tbody tr, tr').each((_, el) => {
    const $row = $(el);
    const position = parseInt($row.find('.kp-standings-rank').text().trim()) || 0;
    const team = $row.find('.kp-standings-team-name').text().trim();
    
    // Skip if this row doesn't have the required standings data (not a standings row)
    if (!position || !team) return;
    const played = parseInt($row.find('.kp-standings-played').text().trim()) || 0;
    const won = parseInt($row.find('.kp-standings-stats').eq(0).text().trim()) || 0;
    const drawn = parseInt($row.find('.kp-standings-stats').eq(1).text().trim()) || 0;
    const lost = parseInt($row.find('.kp-standings-stats').eq(2).text().trim()) || 0;
    
    const goalsText = $row.find('.kp-standings-goals').text().trim();
    const goalsMatch = goalsText.match(/(\d+)-(\d+)/);
    const goalsFor = goalsMatch ? parseInt(goalsMatch[1]) || 0 : 0;
    const goalsAgainst = goalsMatch ? parseInt(goalsMatch[2]) || 0 : 0;
    
    const goalDifference = parseInt($row.find('.kp-standings-gd').text().trim()) || 0;
    const points = parseInt($row.find('.kp-standings-points').text().trim()) || 0;

    const form: string[] = [];
    $row.find('.kp-standings-form-result').each((_, formEl) => {
      const $formEl = $(formEl);
      if ($formEl.hasClass('kp-standings-form-win')) form.push('W');
      else if ($formEl.hasClass('kp-standings-form-draw')) form.push('D');
      else if ($formEl.hasClass('kp-standings-form-loss')) form.push('L');
    });

    // Determine qualification zone based on position (assuming 20-team league)
    // Top 4: Champions League, 5-6: Europa League, 17-20: Relegation
    let qualificationZone: 'champions-league' | 'europa-league' | 'relegation' | null = null;
    if (position <= 4) {
      qualificationZone = 'champions-league';
    } else if (position >= 5 && position <= 6) {
      qualificationZone = 'europa-league';
    } else if (position >= 17) {
      qualificationZone = 'relegation';
    }

    if (team && position > 0) {
      entries.push({
        position,
        team,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        form: form.length > 0 ? form : undefined,
        qualificationZone,
      });
    }
  });

  return entries.length > 0 ? entries : undefined;
}

export function extractTeamForm($: cheerio.CheerioAPI, homeTeam: string, awayTeam: string): { home?: TeamForm; away?: TeamForm } {
  const standings = extractStandings($);
  if (!standings) return {};

  const result: { home?: TeamForm; away?: TeamForm } = {};
  const homeEntry = standings.find(e => 
    e.team.toLowerCase().includes(homeTeam.toLowerCase()) ||
    homeTeam.toLowerCase().includes(e.team.toLowerCase())
  );
  const awayEntry = standings.find(e => 
    e.team.toLowerCase().includes(awayTeam.toLowerCase()) ||
    awayTeam.toLowerCase().includes(e.team.toLowerCase())
  );

  if (homeEntry) {
    result.home = {
      position: homeEntry.position,
      points: homeEntry.points,
      played: homeEntry.played,
      won: homeEntry.won,
      drawn: homeEntry.drawn,
      lost: homeEntry.lost,
      goalsFor: homeEntry.goalsFor,
      goalsAgainst: homeEntry.goalsAgainst,
      form: homeEntry.form || [],
    };
  }

  if (awayEntry) {
    result.away = {
      position: awayEntry.position,
      points: awayEntry.points,
      played: awayEntry.played,
      won: awayEntry.won,
      drawn: awayEntry.drawn,
      lost: awayEntry.lost,
      goalsFor: awayEntry.goalsFor,
      goalsAgainst: awayEntry.goalsAgainst,
      form: awayEntry.form || [],
    };
  }

  return result;
}

function isValidLogoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  // Skip base64 data URIs that are placeholders (very short base64 strings)
  if (url.startsWith('data:image') && url.length < 200) return false;
  // Skip placeholder/ad URLs
  if (url.includes('doubleclick') || url.includes('googleads') || url.includes('placeholder')) return false;
  // Must be a valid URL (http/https) or data URI with sufficient content
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  if (url.startsWith('data:image') && url.length >= 200) return true;
  return false;
}

export function extractLogos($: cheerio.CheerioAPI): { league?: string; homeTeam?: string; awayTeam?: string } {
  const logos: { league?: string; homeTeam?: string; awayTeam?: string } = {};

  // Helper to get best logo URL (prefer data-src for lazy-loaded images, fallback to src)
  const getLogoUrl = (img: cheerio.Cheerio<any>): string | null => {
    if (img.length === 0) return null;
    const dataSrc = img.attr('data-src') || '';
    const src = img.attr('src') || '';
    // Prefer data-src if valid, otherwise use src
    if (isValidLogoUrl(dataSrc)) return dataSrc;
    if (isValidLogoUrl(src)) return src;
    return null;
  };

  // Extract league logo from .kp-league-logo img
  const leagueLogoImg = $('.kp-league-logo').first();
  const leagueUrl = getLogoUrl(leagueLogoImg);
  if (leagueUrl) logos.league = leagueUrl;

  // Extract home team logo from .kp-team.home .kp-team-logo img
  const homeTeamLogoImg = $('.kp-team.home .kp-team-logo').first();
  const homeUrl = getLogoUrl(homeTeamLogoImg);
  if (homeUrl) {
    logos.homeTeam = homeUrl;
  } else {
    // Fallback: check lineup section
    const homeLineupLogo = $('.kp-team-lineup.home .kp-team-logo').first();
    const homeLineupUrl = getLogoUrl(homeLineupLogo);
    if (homeLineupUrl) logos.homeTeam = homeLineupUrl;
  }

  // Extract away team logo from .kp-team.away .kp-team-logo img
  const awayTeamLogoImg = $('.kp-team.away .kp-team-logo').first();
  const awayUrl = getLogoUrl(awayTeamLogoImg);
  if (awayUrl) {
    logos.awayTeam = awayUrl;
  } else {
    // Fallback: check lineup section
    const awayLineupLogo = $('.kp-team-lineup.away .kp-team-logo').first();
    const awayLineupUrl = getLogoUrl(awayLineupLogo);
    if (awayLineupUrl) logos.awayTeam = awayLineupUrl;
  }

  return logos;
}

async function enrichMatchDetailsOnly(match: ScrapedMatch): Promise<ScrapedMatch> {
  try {
    const html = await fetchHTML(match.url);
    const $ = cheerio.load(html);

    const lineups = extractLineups($);
    if (Object.keys(lineups).length > 0) match.lineups = lineups;

    const stats = extractMatchStats($);
    if (stats) match.stats = stats;

    const h2h = extractHeadToHead($);
    if (h2h) match.headToHead = h2h;

    const standings = extractStandings($);
    if (standings) match.standings = standings;

    const teamForm = extractTeamForm($, match.homeTeam, match.awayTeam);
    if (Object.keys(teamForm).length > 0) match.teamForm = teamForm;

    const logos = extractLogos($);
    if (Object.keys(logos).length > 0) match.logos = logos;

    return match;
  } catch (error) {
    console.error(`❌ Error enriching ${match.url}:`, error);
    return match;
  }
}

function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// Concurrent processing with limit
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<T>,
  concurrency: number = 10
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(err => {
        console.error(`Error processing item:`, err);
        return item;
      }))
    );
    results.push(...batchResults);
    
    // Progress update
    const processed = Math.min(i + concurrency, items.length);
    console.log(`📊 Progress: ${processed}/${items.length} matches (${((processed / items.length) * 100).toFixed(1)}%)`);
  }
  
  return results;
}

async function main() {
  console.log('🚀 Fast Highlight Details Enrichment (Concurrent)\n');
  
  const dataPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
  const outputPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    return;
  }

  console.log(`📖 Reading ${dataPath}...`);
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const matches: ScrapedMatch[] = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${matches.length} matches\n`);
  console.log(`⚡ Processing with 10 concurrent requests...\n`);
  
  // Estimate time: ~7 matches/sec = ~3.5 minutes for 1480 matches
  const estimatedTime = (matches.length / 7 / 60).toFixed(1);
  console.log(`⏱️  Estimated time: ~${estimatedTime} minutes\n`);

  const startTime = Date.now();
  
  // Process all matches concurrently (10 at a time)
  const enrichedMatches = await processBatch(matches, enrichMatchDetailsOnly, 10);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Clean and save
  const cleanedMatches = enrichedMatches.map(removeUndefinedFields);
  fs.writeFileSync(outputPath, JSON.stringify(cleanedMatches, null, 2), 'utf-8');

  console.log(`\n\n📊 Enrichment Summary:`);
  console.log(`✅ Processed: ${matches.length} matches`);
  console.log(`⏱️  Time taken: ${duration} seconds`);
  console.log(`💾 Saved to ${outputPath}`);
  if (fs.existsSync(outputPath)) {
    const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
    console.log(`📊 File size: ${sizeMB} MB`);
    console.log(`⚡ Speed: ${(matches.length / parseFloat(duration)).toFixed(1)} matches/second`);
  }
  console.log(`\n✅ Enrichment completed!`);
}

main().catch(console.error);

