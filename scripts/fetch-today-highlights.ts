import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';

// Import enrichment functions from fast-enrich-details.ts
import {
    extractHeadToHead,
    extractLineups,
    extractLogos,
    extractMatchStats,
    extractStandings,
    extractTeamForm
} from './fast-enrich-details';

// Initialize Firebase Admin with dynamic import for ESM compatibility
let admin: any;

async function initFirebase() {
  if (!admin) {
    const firebaseAdmin = await import('firebase-admin');
    admin = firebaseAdmin.default;
    
    if (!admin.apps || admin.apps.length === 0) {
      let cred: any;
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_JSON;
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (raw) {
        const parsed = JSON.parse(raw);
        cred = admin.credential.cert(parsed);
      } else if (filePath) {
        const fileData = readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileData);
        cred = admin.credential.cert(data);
      } else {
        cred = admin.credential.applicationDefault();
      }
      
      admin.initializeApp({
        credential: cred,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
  return admin;
}

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayId(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1); // Go back one day
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  try {
    // Try standard date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const dateDay = date.getDate();
      
      return dateYear === today.getFullYear() && 
             dateMonth === today.getMonth() && 
             dateDay === today.getDate();
    }
    
    // Check if date string contains today's date components
    const lowerDate = dateStr.toLowerCase();
    const todayLower = todayStr.toLowerCase();
    
    // Check for month name
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const todayMonthName = monthNames[today.getMonth()];
    
    if (lowerDate.includes(todayMonthName) && lowerDate.includes(String(today.getDate()))) {
      return true;
    }
    
    // Try DD-MM-YYYY or YYYY-MM-DD formats
    const parts = dateStr.split(/[-/\s]/);
    if (parts.length >= 3) {
      let year, month, day;
      
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        // DD-MM-YYYY format
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return year === today.getFullYear() && 
               month === (today.getMonth() + 1) && 
               day === today.getDate();
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

function isYesterday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  try {
    // Try standard date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const dateDay = date.getDate();
      
      return dateYear === yesterday.getFullYear() && 
             dateMonth === yesterday.getMonth() && 
             dateDay === yesterday.getDate();
    }
    
    // Check if date string contains yesterday's date components
    const lowerDate = dateStr.toLowerCase();
    
    // Check for month name
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const yesterdayMonthName = monthNames[yesterday.getMonth()];
    
    if (lowerDate.includes(yesterdayMonthName) && lowerDate.includes(String(yesterday.getDate()))) {
      return true;
    }
    
    // Try DD-MM-YYYY or YYYY-MM-DD formats
    const parts = dateStr.split(/[-/\s]/);
    if (parts.length >= 3) {
      let year, month, day;
      
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        // DD-MM-YYYY format
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return year === yesterday.getFullYear() && 
               month === (yesterday.getMonth() + 1) && 
               day === yesterday.getDate();
      }
    }
    
    return false;
  } catch {
    return false;
  }
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
  lineups?: any;
  stats?: any;
  headToHead?: any;
  standings?: any;
  teamForm?: any;
  logos?: any;
  [key: string]: any;
}

async function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

function extractMatchId(url: string): string {
  const match = url.match(/dasfootball\.com\/([^\/]+)/);
  return match ? match[1].replace(/\/$/, '') : url.split('/').pop() || Date.now().toString();
}

async function scrapeMatchDetails(url: string): Promise<ScrapedMatch | null> {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    
    const matchData: Partial<ScrapedMatch> = {
      id: extractMatchId(url),
      url: url,
    };

    // Extract title
    const title = $('h1.page-title, h1').first().text().trim();
    if (title) {
      let cleanTitle = title
        .replace(/HIGHLIGHTS:\s*/gi, '')
        .replace(/Highlights and Goals/gi, '')
        .replace(/Video Highlights/gi, '')
        .replace(/Highlights/gi, '')
        .replace(/and Stats/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const teamsMatch = cleanTitle.match(/(.+?)\s+vs\s+(.+?)$/i);
      if (teamsMatch) {
        matchData.homeTeam = teamsMatch[1].trim();
        matchData.awayTeam = teamsMatch[2].trim();
        matchData.title = `${matchData.homeTeam} vs ${matchData.awayTeam}`;
      } else {
        matchData.title = cleanTitle;
      }
    }

    // Extract league - get clean text only, not HTML
    let league = '';
    
    // Strategy 1: Get alt attribute from league logo image (most reliable)
    const leagueImg = $('.kp-league-logo img, [class*="league-logo"] img').first();
    if (leagueImg.length > 0) {
      league = leagueImg.attr('alt') || '';
      if (league) {
        // Clean up: remove "logo", "badge" etc. from alt text if present
        league = league.replace(/\s*(logo|badge|crest)\s*/gi, '').trim();
      }
    }
    
    // Strategy 2: Get text from .kp-league-name element (excluding child elements)
    if (!league) {
      const leagueElement = $('.kp-league-name').first();
      if (leagueElement.length > 0) {
        // Clone element, remove all children (images, etc.), then get text
        league = leagueElement.clone().children().remove().end().text().trim();
        // If still empty, try direct text but filter out HTML
        if (!league) {
          const rawText = leagueElement.text().trim();
          // Remove HTML tags and clean up
          league = rawText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        }
      }
    }
    
    // Strategy 3: Try category element
    if (!league) {
      const categoryEl = $('.grid-posts-category, [class*="category"]').first();
      if (categoryEl.length > 0) {
        league = categoryEl.clone().children().remove().end().text().trim() ||
                 categoryEl.text().trim();
        // Remove HTML tags
        league = league.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    
    // Final cleanup: remove any remaining HTML entities and normalize whitespace
    league = league.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Extract just the league name if it contains extra text (time, date, etc.)
    // Look for common league names in the text
    const commonLeagues = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Champions League', 'Europa League', 'FA Cup', 'EFL Cup'];
    for (const commonLeague of commonLeagues) {
      if (league.toLowerCase().includes(commonLeague.toLowerCase())) {
        league = commonLeague;
        break;
      }
    }
    
    matchData.league = league || 'Other';
    matchData.category = league || 'Other';

    // Extract date and time
    const dateText = $('.kp-date').first().text().trim() || 
                     $('time[datetime]').attr('datetime') || 
                     $('[datetime]').attr('datetime') || '';
    let date = '';
    if (dateText) {
      try {
        const dateObj = new Date(dateText);
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } else {
          date = dateText;
        }
      } catch {
        date = dateText;
      }
    }
    matchData.date = date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const timeText = $('.kp-time').first().text().trim();
    matchData.time = timeText || undefined;

    // Helper function to clean team names
    const cleanTeamName = (name: string): string => {
      if (!name) return name;
      return name
        .replace(/HIGHLIGHTS:\s*/gi, '')
        .replace(/Highlights/gi, '')
        .replace(/Video Highlights/gi, '')
        .replace(/Highlights and Goals/gi, '')
        .replace(/and Stats/gi, '')
        .replace(/Stats/gi, '')
        .replace(/and\s+Video/gi, '')
        .replace(/\s+Video\s*$/gi, '') // Remove "Video" at the end
        .replace(/^Video\s+/gi, '') // Remove "Video" at the start
        .replace(/\s+Video\s+/gi, ' ') // Remove "Video" in the middle
        .replace(/\s+and\s+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Extract teams if not found in title
    if (!matchData.homeTeam || !matchData.awayTeam) {
      const teamNames = $('.kp-team-name').map((_, el) => $(el).text().trim()).get();
      if (teamNames.length >= 2) {
        matchData.homeTeam = cleanTeamName(teamNames[0]);
        matchData.awayTeam = cleanTeamName(teamNames[1]);
      }
    } else {
      // Clean existing team names
      matchData.homeTeam = cleanTeamName(matchData.homeTeam!);
      matchData.awayTeam = cleanTeamName(matchData.awayTeam!);
    }

    // Extract score
    const scoreText = $('.kp-score-value').first().text().trim();
    matchData.score = scoreText || undefined;

    // Extract halftime score
    const halftimeText = $('.kp-score-value').parent().text().match(/HT[:\s]*\(([^)]+)\)/);
    matchData.halftimeScore = halftimeText ? halftimeText[1].trim() : undefined;

    // Extract stage
    const stageText = $('.kp-stage-info span').first().text().trim();
    matchData.stage = stageText || undefined;

    // Extract video source (comprehensive strategies matching scrape-dasfootball-highlights.ts)
    let videoSrc = '';
    
    // Strategy 1: Direct video tag (fp-engine class) inside fp-player - MOST RELIABLE
    // This matches: <div class="fp-player"><video class="fp-engine" src="..."></video>
    const videoTag = $('.fp-player video.fp-engine').first();
    if (videoTag.length > 0) {
      videoSrc = videoTag.attr('src') || '';
      // Decode HTML entities like &amp; to &
      if (videoSrc) {
        videoSrc = videoSrc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      }
    }
    
    // Strategy 1b: Fallback to any video.fp-engine tag
    if (!videoSrc) {
      const videoTagFallback = $('video.fp-engine').first();
      if (videoTagFallback.length > 0) {
        videoSrc = videoTagFallback.attr('src') || '';
        if (videoSrc) {
          videoSrc = videoSrc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }
      }
    }
    
    // Strategy 2: data-item attribute (JSON with sources)
    if (!videoSrc) {
      const dataItem = $('[data-item]').attr('data-item') || '';
      if (dataItem) {
        try {
          // Decode HTML entities first
          const decoded = dataItem.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const parsed = JSON.parse(decoded);
          if (parsed.sources && parsed.sources[0] && parsed.sources[0].src) {
            videoSrc = parsed.sources[0].src;
          }
        } catch (e) {
          // Fallback to regex if JSON parse fails
          const videoMatch1 = dataItem.match(/"sources":\[{"src":"([^"]+)"/);
          if (videoMatch1) {
            videoSrc = decodeURIComponent(videoMatch1[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&'));
          }
        }
      }
    }
    
    // Strategy 3: Look for streamable/spotlightmoment URLs in links
    if (!videoSrc) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('streamable.com') || href.includes('spotlightmoment')) {
          videoSrc = href;
          return false; // break
        }
      });
    }
    
    // Strategy 4: iframe src (last resort, usually ads)
    if (!videoSrc) {
      const iframeSrc = $('iframe[src]').not('[src*="doubleclick"]').not('[src*="googleads"]').first().attr('src') || '';
      if (iframeSrc && (iframeSrc.includes('streamable') || iframeSrc.includes('spotlightmoment'))) {
        videoSrc = iframeSrc;
      }
    }
    
    // Strategy 5: Check if we got a Google URL (likely reCAPTCHA/ad) and search for CDN URL in HTML
    if (videoSrc && videoSrc.startsWith('https://www.google.com/')) {
      console.log(`  ⚠️ Found Google URL, searching for CDN URL...`);
      videoSrc = ''; // Reset to search again
      
      // Search HTML content for streamable CDN URLs
      const cdnUrlPattern = /https:\/\/cdn-cf-east\.streamable\.com\/video\/mp4\/[^\s"'<>]+/gi;
      const cdnMatches = html.match(cdnUrlPattern);
      
      if (cdnMatches && cdnMatches.length > 0) {
        // Use the first CDN URL found, prefer the full URL with query params
        const fullUrl = cdnMatches.find(url => url.includes('?')) || cdnMatches[0];
        videoSrc = fullUrl;
        console.log(`  ✅ Found CDN URL: ${videoSrc.substring(0, 80)}...`);
      } else {
        // Also check in data attributes and script tags
        const scriptTags = $('script').toArray();
        for (const script of scriptTags) {
          const scriptContent = $(script).html() || '';
          const scriptMatches = scriptContent.match(cdnUrlPattern);
          if (scriptMatches && scriptMatches.length > 0) {
            const fullUrl = scriptMatches.find(url => url.includes('?')) || scriptMatches[0];
            videoSrc = fullUrl;
            console.log(`  ✅ Found CDN URL in script: ${videoSrc.substring(0, 80)}...`);
            break;
          }
        }
        
        // Also check in all data attributes
        if (!videoSrc) {
          $('[data-item], [data-src], [data-url]').each((_, el) => {
            const dataItem = $(el).attr('data-item') || $(el).attr('data-src') || $(el).attr('data-url') || '';
            const dataMatches = dataItem.match(cdnUrlPattern);
            if (dataMatches && dataMatches.length > 0) {
              const fullUrl = dataMatches.find(url => url.includes('?')) || dataMatches[0];
              videoSrc = fullUrl;
              console.log(`  ✅ Found CDN URL in data attribute: ${videoSrc.substring(0, 80)}...`);
              return false; // break
            }
          });
        }
      }
    }
    
    matchData.videoSrc = videoSrc || undefined;

    // Extract venue
    const venueText = $('.kp-venue-info span').first().text().trim() ||
                     html.match(/Venue[:\s]+([^<\n]+)/i)?.[1]?.trim();
    matchData.venue = venueText || undefined;

    // Extract referee
    const refereeText = html.match(/Referee[:\s]+([^<\n]+)/i)?.[1]?.trim();
    matchData.referee = refereeText || undefined;

    // Only return if we have essential data and videoSrc contains "cdn"
    if (!matchData.homeTeam || !matchData.awayTeam || !matchData.videoSrc || 
        typeof matchData.videoSrc !== 'string' || !matchData.videoSrc.toLowerCase().includes('cdn')) {
      return null;
    }

    // Enrich match with detailed data (lineups, stats, standings, logos, etc.)
    console.log(`  📊 Enriching match details...`);
    try {
      // Extract lineups
      const lineups = extractLineups($);
      if (Object.keys(lineups).length > 0) {
        matchData.lineups = lineups;
        console.log(`  ✅ Extracted lineups`);
      }

      // Extract match stats
      const stats = extractMatchStats($);
      if (stats) {
        matchData.stats = stats;
        console.log(`  ✅ Extracted match stats`);
      }

      // Extract head to head
      const h2h = extractHeadToHead($);
      if (h2h) {
        matchData.headToHead = h2h;
        console.log(`  ✅ Extracted head to head`);
      }

      // Extract standings
      const standings = extractStandings($);
      if (standings) {
        matchData.standings = standings;
        console.log(`  ✅ Extracted standings (${standings.length} teams)`);
      }

      // Extract team form
      const teamForm = extractTeamForm($, matchData.homeTeam!, matchData.awayTeam!);
      if (Object.keys(teamForm).length > 0) {
        matchData.teamForm = teamForm;
        console.log(`  ✅ Extracted team form`);
      }

      // Extract logos
      const logos = extractLogos($);
      if (Object.keys(logos).length > 0) {
        matchData.logos = logos;
        console.log(`  ✅ Extracted logos`);
      }
    } catch (error) {
      console.error(`  ⚠️ Error enriching details:`, error);
      // Continue anyway - we still have basic match data
    }

    return matchData as ScrapedMatch;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function scrapeHomepageForToday(): Promise<string[]> {
  console.log('📄 Scraping homepage for today\'s match links...');
  
  const matchLinks: string[] = [];
  const maxPages = 10; // Only check first 10 pages for today's matches
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      let url = 'https://dasfootball.com/';
      if (page > 1) {
        url = `https://dasfootball.com/page/${page}/`;
      }
      
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);
      
      let foundToday = false;
      $('article.grid-posts-item, article[class*="post"]').each((_, element) => {
        const link = $(element).find('a[href*="/"]').first().attr('href');
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `https://dasfootball.com${link}`;
          if (fullUrl.includes('dasfootball.com/') && 
              !fullUrl.includes('category') && 
              !fullUrl.includes('tag')) {
            
            // Check date on the article
            const dateText = $(element).find('.kp-date, time, [datetime]').first().text().trim() ||
                           $(element).find('time').attr('datetime') || '';
            
            if (dateText && isToday(dateText)) {
              matchLinks.push(fullUrl.split('#')[0].split('?')[0]);
              foundToday = true;
            }
          }
        }
      });
      
      // If no today matches found on this page, likely no more today matches
      if (!foundToday && page > 1) {
        break;
      }
      
      await waitFor(500); // Delay between pages
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return matchLinks;
}

async function saveToFirestore(matches: ScrapedMatch[], existingMatches: ScrapedMatch[] = []): Promise<void> {
  if (matches.length === 0) {
    console.log('⚠️  No new matches to save');
    return;
  }

  try {
    const admin = await initFirebase();
    const highlightsCol = admin.firestore().collection('highlights');
    const today = todayId(); // Use today's date for regular scraping

    // Merge existing matches with new matches (avoid duplicates by ID)
    const existingIds = new Set(existingMatches.map(m => m.id));
    const newMatches = matches.filter(m => !existingIds.has(m.id));
    const mergedMatches = [...existingMatches, ...newMatches];

    // Prepare data for Firestore (remove undefined fields)
    const cleanedMatches = mergedMatches.map((match: any) => {
      const cleaned: any = {};
      Object.keys(match).forEach((key) => {
        if (match[key] !== undefined) {
          cleaned[key] = match[key];
        }
      });
      return cleaned;
    });

    console.log(`💾 Merging ${newMatches.length} new matches with ${existingMatches.length} existing matches...`);
    console.log(`   Total: ${cleanedMatches.length} matches`);
    console.log(`   Document: highlights/${today}`);

    await highlightsCol.doc(today).set({
      date: today,
      matches: cleanedMatches,
      count: cleanedMatches.length,
      updatedAt: new Date().toISOString(),
    }, { merge: true }); // Use merge to update, not overwrite

    console.log(`✅ Successfully saved ${cleanedMatches.length} highlights to Firestore!`);
    console.log(`   📍 Path: highlights/${today}`);
    console.log(`   ✨ Added ${newMatches.length} new matches`);
  } catch (error: any) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Fetching today\'s highlights from DasFootball...\n');

  try {
    const admin = await initFirebase();
    const highlightsCol = admin.firestore().collection('highlights');
    const today = todayId(); // Use today's date for regular scraping
    
    // Get existing matches for today
    let existingMatches: ScrapedMatch[] = [];
    try {
      const todayDoc = await highlightsCol.doc(today).get();
      if (todayDoc.exists) {
        const data = todayDoc.data();
        existingMatches = Array.isArray(data?.matches) ? data.matches : [];
        console.log(`📖 Found ${existingMatches.length} existing matches for today\n`);
      }
    } catch (error) {
      console.log('ℹ️  No existing document for today, starting fresh\n');
    }

    // Scrape homepage for today's matches
    const matchLinks = await scrapeHomepageForToday();
    
    if (matchLinks.length === 0) {
      console.log('❌ No matches found for today!');
      return;
    }

    console.log(`📋 Found ${matchLinks.length} potential matches for today\n`);

    // Scrape details for each match
    const todayMatches: ScrapedMatch[] = [];
    for (let i = 0; i < matchLinks.length; i++) {
      const link = matchLinks[i];
      console.log(`[${i + 1}/${matchLinks.length}] Processing: ${link}`);
      
      const matchData = await scrapeMatchDetails(link);
      
      if (matchData && isToday(matchData.date)) {
        todayMatches.push(matchData);
        console.log(`✅ Added: ${matchData.title || matchData.id}`);
      } else {
        console.log(`⏭️  Skipped (not today or no CDN video)`);
      }
      
      await waitFor(800); // Delay between requests
    }

    // Filter for CDN video sources
    const validMatches = todayMatches.filter(m => 
      m.videoSrc && typeof m.videoSrc === 'string' && m.videoSrc.toLowerCase().includes('cdn')
    );

    console.log(`\n📊 Results:`);
    console.log(`   Found: ${todayMatches.length} matches for today`);
    console.log(`   With CDN: ${validMatches.length} matches\n`);

    if (validMatches.length > 0) {
      await saveToFirestore(validMatches, existingMatches);
      console.log(`\n✅ Done! ${validMatches.length} new matches added to today's highlights.`);
    } else {
      console.log(`\n⚠️  No new matches with CDN video sources found for today.`);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

