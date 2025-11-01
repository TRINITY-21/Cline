import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface ScrapedMatch {
  id: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  [key: string]: any;
}

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    throw error;
  }
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

function extractLogos($: cheerio.CheerioAPI): { league?: string; homeTeam?: string; awayTeam?: string } {
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

async function addLogosToMatch(match: ScrapedMatch): Promise<ScrapedMatch> {
  try {
    const html = await fetchHTML(match.url);
    const $ = cheerio.load(html);
    const logos = extractLogos($);
    if (Object.keys(logos).length > 0) {
      match.logos = logos;
    }
    return match;
  } catch (error) {
    return match; // Return original if fetch fails
  }
}

async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<T>,
  concurrency: number = 10
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(() => item))
    );
    results.push(...batchResults);
    
    const processed = Math.min(i + concurrency, items.length);
    if (processed % 50 === 0 || processed === items.length) {
      console.log(`📊 Progress: ${processed}/${items.length} matches (${((processed / items.length) * 100).toFixed(1)}%)`);
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 Adding Logos to Enriched Matches\n');
  
  const enrichedPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  
  if (!fs.existsSync(enrichedPath)) {
    console.error(`❌ File not found: ${enrichedPath}`);
    return;
  }

  console.log(`📖 Reading ${enrichedPath}...`);
  const rawData = fs.readFileSync(enrichedPath, 'utf-8');
  const matches: ScrapedMatch[] = JSON.parse(rawData);
  
  console.log(`✅ Loaded ${matches.length} matches\n`);
  console.log(`⚡ Processing with 10 concurrent requests...\n`);

  const startTime = Date.now();
  
  // Process all matches concurrently to add logos
  const enrichedMatches = await processBatch(matches, addLogosToMatch, 10);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Save
  fs.writeFileSync(enrichedPath, JSON.stringify(enrichedMatches, null, 2), 'utf-8');

  // Count how many got logos
  const withLogos = enrichedMatches.filter(m => m.logos && Object.keys(m.logos).length > 0).length;

  console.log(`\n\n📊 Logo Extraction Summary:`);
  console.log(`✅ Processed: ${matches.length} matches`);
  console.log(`🎨 Matches with logos: ${withLogos}`);
  console.log(`⏱️  Time taken: ${duration} seconds`);
  console.log(`💾 Saved to ${enrichedPath}`);
  if (fs.existsSync(enrichedPath)) {
    const sizeMB = (fs.statSync(enrichedPath).size / 1024 / 1024).toFixed(2);
    console.log(`📊 File size: ${sizeMB} MB`);
  }
  console.log(`\n✅ Logo extraction completed!`);
}

main().catch(console.error);

