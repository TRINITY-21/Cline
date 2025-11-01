import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

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
  homeRecord?: {
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  awayRecord?: {
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  };
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
}

async function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

function extractLineups($: cheerio.CheerioAPI): { home?: Lineup; away?: Lineup } {
  const lineups: { home?: Lineup; away?: Lineup } = {};

  // Extract home lineup
  const homeLineupDiv = $('.kp-team-lineup.home').first();
  if (homeLineupDiv.length > 0) {
    const players: Player[] = [];
    const substitutes: Player[] = [];

    // Extract formation for home team
    const formation = homeLineupDiv.find('.kp-formation').text().trim() || undefined;

    // Starting XI - players are in .kp-player-row within .kp-players-list
    homeLineupDiv.find('.kp-players-list').first().find('.kp-player-row').each((_, el) => {
      const $player = $(el);
      const nameText = $player.find('.kp-player-name').text().trim();
      // Remove HTML comments and extra whitespace
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $player.find('.kp-player-position').text().trim();
      const numberText = $player.find('.kp-player-number').text().trim();
      const number = parseInt(numberText) || 0;
      
      // Extract rating
      const ratingText = $player.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;
      
      // Check for captain (C) in name
      const isCaptain = name.includes('(C)') || nameText.includes('captain');
      // Remove (C) from name
      const cleanName = name.replace(/\s*\(C\)\s*/g, '').trim();
      
      // Count yellow/red cards from events
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

    // Substitutes - in .kp-subs .kp-players-list .kp-player-row
    homeLineupDiv.find('.kp-subs .kp-players-list .kp-player-row').each((_, el) => {
      const $sub = $(el);
      const nameText = $sub.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $sub.find('.kp-player-position').text().trim() || 'Sub';
      const numberText = $sub.find('.kp-player-number').text().trim();
      const number = parseInt(numberText) || 0;
      const ratingText = $sub.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;

      if (name) {
        substitutes.push({
          number,
          position,
          name,
          rating,
        });
      }
    });

    // Coach (if available)
    const coach = homeLineupDiv.find('.kp-coach').text().trim() || undefined;

    if (players.length > 0 || substitutes.length > 0) {
      lineups.home = {
        formation,
        players,
        substitutes,
        coach,
      };
    }
  }

  // Extract away lineup (same logic)
  const awayLineupDiv = $('.kp-team-lineup.away').first();
  if (awayLineupDiv.length > 0) {
    const players: Player[] = [];
    const substitutes: Player[] = [];

    // Extract formation for away team
    const formation = awayLineupDiv.find('.kp-formation').text().trim() || undefined;

    awayLineupDiv.find('.kp-players-list').first().find('.kp-player-row').each((_, el) => {
      const $player = $(el);
      const nameText = $player.find('.kp-player-name').text().trim();
      const name = nameText.replace(/<!--.*?-->/g, '').trim();
      const position = $player.find('.kp-player-position').text().trim();
      const numberText = $player.find('.kp-player-number').text().trim();
      const number = parseInt(numberText) || 0;
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
      const numberText = $sub.find('.kp-player-number').text().trim();
      const number = parseInt(numberText) || 0;
      const ratingText = $sub.find('.kp-player-rating').text().trim();
      const rating = ratingText ? parseFloat(ratingText) : null;

      if (name) {
        substitutes.push({
          number,
          position,
          name,
          rating,
        });
      }
    });

    const coach = awayLineupDiv.find('.kp-coach').text().trim() || undefined;

    if (players.length > 0 || substitutes.length > 0) {
      lineups.away = {
        formation,
        players,
        substitutes,
        coach,
      };
    }
  }

  return lineups;
}

function extractMatchStats($: cheerio.CheerioAPI): MatchStats | undefined {
  const statsDiv = $('.kop-match-stats');
  if (statsDiv.length === 0) return undefined;

  const stats: MatchStats = {};

  // Extract possession from possession-container
  const possessionDiv = statsDiv.find('.possession-container');
  if (possessionDiv.length > 0) {
    const homeWidth = possessionDiv.find('.kop-stats-bar-home').attr('style');
    const homeMatch = homeWidth?.match(/width:\s*(\d+)%/);
    const home = homeMatch ? parseInt(homeMatch[1]) : 0;
    const away = 100 - home;
    
    if (home > 0) {
      stats.possession = { home, away };
    }
  }

  // Extract expected goals (xG) from stat-container
  statsDiv.find('.stat-container').each((_, el) => {
    const $container = $(el);
    const label = $container.find('.stat-label').text().trim();
    
    if (label.toLowerCase().includes('expected goals') || label.toLowerCase().includes('xg')) {
      const homeValue = $container.find('.stat-value').first().text().trim();
      const awayValue = $container.find('.stat-value').last().text().trim();
      const home = parseFloat(homeValue) || 0;
      const away = parseFloat(awayValue) || 0;
      
      if (home >= 0 && away >= 0) {
        stats.expectedGoals = { home, away };
      }
    }
  });

  // Extract attack stats
  stats.attack = {};
  const attackSection = statsDiv.find('.kop-stats-section').filter((_, el) => {
    return $(el).find('.kop-stats-section-title').text().trim().toLowerCase() === 'attack';
  });
  
  if (attackSection.length > 0) {
    attackSection.find('.stat-container').each((_, el) => {
      const $container = $(el);
      const label = $container.find('.stat-label').text().trim();
      const homeValue = $container.find('.stat-value').first().text().trim();
      const awayValue = $container.find('.stat-value').last().text().trim();
      
      if (label && homeValue && awayValue) {
        const statId = label.toLowerCase().replace(/\s+/g, '_');
        stats.attack![statId] = {
          label,
          home: homeValue,
          away: awayValue,
        };
      }
    });
  }

  // Extract passing stats
  stats.passing = {};
  const passingSection = statsDiv.find('.kop-stats-section').filter((_, el) => {
    return $(el).find('.kop-stats-section-title').text().trim().toLowerCase() === 'passing';
  });
  
  if (passingSection.length > 0) {
    passingSection.find('.stat-container').each((_, el) => {
      const $container = $(el);
      const label = $container.find('.stat-label').text().trim();
      const homeValue = $container.find('.stat-value').first().text().trim();
      const awayValue = $container.find('.stat-value').last().text().trim();
      
      if (label && homeValue && awayValue) {
        const statId = label.toLowerCase().replace(/\s+/g, '_');
        stats.passing![statId] = {
          label,
          home: homeValue,
          away: awayValue,
        };
      }
    });
  }

  // Extract discipline stats
  stats.discipline = {};
  const disciplineSection = statsDiv.find('.kop-stats-section').filter((_, el) => {
    return $(el).find('.kop-stats-section-title').text().trim().toLowerCase() === 'discipline';
  });
  
  if (disciplineSection.length > 0) {
    disciplineSection.find('.stat-container').each((_, el) => {
      const $container = $(el);
      const label = $container.find('.stat-label').text().trim();
      const homeValue = $container.find('.stat-value').first().text().trim();
      const awayValue = $container.find('.stat-value').last().text().trim();
      
      if (label && homeValue && awayValue) {
        const statId = label.toLowerCase().replace(/\s+/g, '_');
        stats.discipline![statId] = {
          label,
          home: homeValue,
          away: awayValue,
        };
      }
    });
  }

  return Object.keys(stats).length > 0 ? stats : undefined;
}

function extractHeadToHead($: cheerio.CheerioAPI): HeadToHead | undefined {
  const h2hDiv = $('.kp-h2h-stats');
  if (h2hDiv.length === 0) return undefined;

  const h2h: HeadToHead = {};

  // Extract win/draw counts
  const homeWinsMatch = h2hDiv.text().match(/Home Wins[:\s]+(\d+)/i);
  const awayWinsMatch = h2hDiv.text().match(/Away Wins[:\s]+(\d+)/i);
  const drawsMatch = h2hDiv.text().match(/Draws[:\s]+(\d+)/i);

  if (homeWinsMatch) h2h.homeWins = parseInt(homeWinsMatch[1]) || 0;
  if (awayWinsMatch) h2h.awayWins = parseInt(awayWinsMatch[1]) || 0;
  if (drawsMatch) h2h.draws = parseInt(drawsMatch[1]) || 0;

  // Last meetings count
  const lastMeetingsMatch = h2hDiv.text().match(/Last (\d+) Meetings/i);
  if (lastMeetingsMatch) {
    h2h.lastMeetings = parseInt(lastMeetingsMatch[1]) || 0;
  }

  // Description
  const description = h2hDiv.find('p, .kp-h2h-description').text().trim();
  if (description) h2h.description = description;

  return Object.keys(h2h).length > 0 ? h2h : undefined;
}

function extractStandings($: cheerio.CheerioAPI): StandingsEntry[] | undefined {
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

    // Extract form
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

function extractTeamForm($: cheerio.CheerioAPI, homeTeam: string, awayTeam: string): { home?: TeamForm; away?: TeamForm } {
  const standings = extractStandings($);
  if (!standings) return {};

  const result: { home?: TeamForm; away?: TeamForm } = {};

  // Find home team in standings
  const homeEntry = standings.find(e => 
    e.team.toLowerCase().includes(homeTeam.toLowerCase()) ||
    homeTeam.toLowerCase().includes(e.team.toLowerCase())
  );

  // Find away team in standings
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

async function enrichMatchDetails(match: ScrapedMatch): Promise<ScrapedMatch> {
  try {
    console.log(`\n🔍 Enriching: ${match.title} (${match.url})`);
    
    const html = await fetchHTML(match.url);
    const $ = cheerio.load(html);

    // Extract lineups
    const lineups = extractLineups($);
    if (Object.keys(lineups).length > 0) {
      match.lineups = lineups;
      console.log(`  ✅ Extracted lineups`);
    }

    // Extract match stats
    const stats = extractMatchStats($);
    if (stats) {
      match.stats = stats;
      console.log(`  ✅ Extracted match stats`);
    }

    // Extract head to head
    const h2h = extractHeadToHead($);
    if (h2h) {
      match.headToHead = h2h;
      console.log(`  ✅ Extracted head to head`);
    }

    // Extract standings
    const standings = extractStandings($);
    if (standings) {
      match.standings = standings;
      console.log(`  ✅ Extracted standings (${standings.length} teams)`);
    }

    // Extract team form
    const teamForm = extractTeamForm($, match.homeTeam, match.awayTeam);
    if (Object.keys(teamForm).length > 0) {
      match.teamForm = teamForm;
      console.log(`  ✅ Extracted team form`);
    }

    return match;
  } catch (error) {
    console.error(`❌ Error enriching ${match.url}:`, error);
    return match; // Return original match if enrichment fails
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

async function main() {
  console.log('🚀 Starting highlight details enrichment...\n');
  
  const dataPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    return;
  }

  console.log(`📖 Reading ${dataPath}...`);
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const allMatches: ScrapedMatch[] = JSON.parse(rawData);
  
  // Process only first 5 matches for testing
  const matches = allMatches.slice(0, 5);
  
  console.log(`✅ Loaded ${allMatches.length} total matches`);
  console.log(`📝 Processing first 5 matches for enrichment\n`);

  let enrichedCount = 0;
  let errorCount = 0;

  // Process matches in batches
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    console.log(`[${i + 1}/${matches.length}] Processing: ${match.title || match.id}`);
    
    try {
      const enriched = await enrichMatchDetails(match);
      matches[i] = enriched;
      enrichedCount++;
      
      // Save progress every BATCH_SIZE matches
      if ((i + 1) % BATCH_SIZE === 0) {
        const cleanedMatches = matches.map(removeUndefinedFields);
        const outputPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
        fs.writeFileSync(outputPath, JSON.stringify(cleanedMatches, null, 2), 'utf-8');
        console.log(`\n💾 Progress saved: ${i + 1}/${matches.length} matches enriched\n`);
      }
      
      // Delay between requests to avoid rate limiting
      await waitFor(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to enrich match ${match.id}:`, error);
    }
  }

  // Final save with cleaned data (no undefined fields) to new file
  const cleanedMatches = matches.map(removeUndefinedFields);
  const outputPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  fs.writeFileSync(outputPath, JSON.stringify(cleanedMatches, null, 2), 'utf-8');

  console.log(`\n\n📊 Enrichment Summary:`);
  console.log(`✅ Enriched: ${enrichedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📦 Total: ${matches.length}`);
  console.log(`💾 Saved to ${outputPath}`);
  if (fs.existsSync(outputPath)) {
    console.log(`📊 Enriched file size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }
  console.log(`\n✅ Enrichment completed!`);
}

// Run the enrichment
main().catch(console.error);

