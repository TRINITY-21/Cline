import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

// Import enrichment functions from fast-enrich-details.ts
import {
  extractHeadToHead,
  extractLineups,
  extractLogos,
  extractMatchStats,
  extractStandings,
  extractTeamForm
} from './fast-enrich-details';

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  try {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    // Parse date string (format: "October 31, 2025" or similar)
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      
      return year === todayYear && month === todayMonth && day === todayDay;
    }
  } catch {
    return false;
  }
  
  return false;
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
        league = league.replace(/\s*(logo|badge|crest)\s*/gi, '').trim();
      }
    }
    
    // Strategy 2: Get text from .kp-league-name element (excluding child elements)
    if (!league) {
      const leagueElement = $('.kp-league-name').first();
      if (leagueElement.length > 0) {
        league = leagueElement.clone().children().remove().end().text().trim();
        if (!league) {
          const rawText = leagueElement.text().trim();
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
        league = league.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    
    // Final cleanup
    league = league.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Extract just the league name if it contains extra text
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
        .replace(/\s+Video\s*$/gi, '')
        .replace(/^Video\s+/gi, '')
        .replace(/\s+Video\s+/gi, ' ')
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

    // Extract video source (comprehensive strategies)
    let videoSrc = '';
    
    // Strategy 1: Direct video tag (fp-engine class) inside fp-player
    const videoTag = $('.fp-player video.fp-engine').first();
    if (videoTag.length > 0) {
      videoSrc = videoTag.attr('src') || '';
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
          const decoded = dataItem.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const parsed = JSON.parse(decoded);
          if (parsed.sources && parsed.sources[0] && parsed.sources[0].src) {
            videoSrc = parsed.sources[0].src;
          }
        } catch (e) {
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
          return false;
        }
      });
    }
    
    // Strategy 4: iframe src
    if (!videoSrc) {
      const iframeSrc = $('iframe[src]').not('[src*="doubleclick"]').not('[src*="googleads"]').first().attr('src') || '';
      if (iframeSrc && (iframeSrc.includes('streamable') || iframeSrc.includes('spotlightmoment'))) {
        videoSrc = iframeSrc;
      }
    }
    
    // Strategy 5: Check if we got a Google URL and search for CDN URL in HTML
    if (videoSrc && videoSrc.startsWith('https://www.google.com/')) {
      videoSrc = '';
      
      const cdnUrlPattern = /https:\/\/cdn-cf-east\.streamable\.com\/video\/mp4\/[^\s"'<>]+/gi;
      const cdnMatches = html.match(cdnUrlPattern);
      
      if (cdnMatches && cdnMatches.length > 0) {
        const fullUrl = cdnMatches.find(url => url.includes('?')) || cdnMatches[0];
        videoSrc = fullUrl;
      } else {
        const scriptTags = $('script').toArray();
        for (const script of scriptTags) {
          const scriptContent = $(script).html() || '';
          const scriptMatches = scriptContent.match(cdnUrlPattern);
          if (scriptMatches && scriptMatches.length > 0) {
            const fullUrl = scriptMatches.find(url => url.includes('?')) || scriptMatches[0];
            videoSrc = fullUrl;
            break;
          }
        }
        
        if (!videoSrc) {
          $('[data-item], [data-src], [data-url]').each((_, el) => {
            const dataItem = $(el).attr('data-item') || $(el).attr('data-src') || $(el).attr('data-url') || '';
            const dataMatches = dataItem.match(cdnUrlPattern);
            if (dataMatches && dataMatches.length > 0) {
              const fullUrl = dataMatches.find(url => url.includes('?')) || dataMatches[0];
              videoSrc = fullUrl;
              return false;
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

    // Enrich match with detailed data
    console.log(`  📊 Enriching match details...`);
    try {
      const lineups = extractLineups($);
      if (Object.keys(lineups).length > 0) {
        matchData.lineups = lineups;
        console.log(`  ✅ Extracted lineups`);
      }

      const stats = extractMatchStats($);
      if (stats) {
        matchData.stats = stats;
        console.log(`  ✅ Extracted match stats`);
      }

      const h2h = extractHeadToHead($);
      if (h2h) {
        matchData.headToHead = h2h;
        console.log(`  ✅ Extracted head to head`);
      }

      const standings = extractStandings($);
      if (standings) {
        matchData.standings = standings;
        console.log(`  ✅ Extracted standings (${standings.length} teams)`);
      }

      const teamForm = extractTeamForm($, matchData.homeTeam!, matchData.awayTeam!);
      if (Object.keys(teamForm).length > 0) {
        matchData.teamForm = teamForm;
        console.log(`  ✅ Extracted team form`);
      }

      const logos = extractLogos($);
      if (Object.keys(logos).length > 0) {
        matchData.logos = logos;
        console.log(`  ✅ Extracted logos`);
      }
    } catch (error) {
      console.error(`  ⚠️ Error enriching details:`, error);
    }

    return matchData as ScrapedMatch;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function scrapeHomepageForToday(): Promise<string[]> {
  console.log('📄 Scraping homepage for today\'s match links...');
  
  const baseUrl = 'https://dasfootball.com';
  const maxPages = 3;
  const matchLinks: string[] = [];
  
  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}/page/${page}/`;
    console.log(`  📖 Checking page ${page}...`);
    
    try {
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);
      
      // Find all match links on the page
      $('article a[href*="/match-highlights-"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
          if (!matchLinks.includes(fullUrl)) {
            matchLinks.push(fullUrl);
          }
        }
      });
      
      console.log(`    Found ${matchLinks.length} total links so far...`);
      
      // Check if we should continue (if this page has matches)
      const hasMatches = $('article a[href*="/match-highlights-"]').length > 0;
      if (!hasMatches) {
        console.log(`  ℹ️  No more matches found on page ${page}, stopping.`);
        break;
      }
      
      await waitFor(500); // Delay between page requests
    } catch (error) {
      console.error(`  ⚠️  Error fetching page ${page}:`, error);
      break;
    }
  }
  
  return matchLinks;
}

async function main() {
  console.log('🚀 TEST: Fetching today\'s highlights from DasFootball (JSON OUTPUT ONLY)\n');

  try {
    const today = todayId();
    console.log(`📅 Target date: ${today}\n`);

    // Scrape homepage for today's matches
    const matchLinks = await scrapeHomepageForToday();
    
    if (matchLinks.length === 0) {
      console.log('❌ No matches found for today!');
      process.exit(0);
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

    // Output JSON instead of saving to Firestore
    const output = {
      date: today,
      timestamp: new Date().toISOString(),
      count: validMatches.length,
      matches: validMatches
    };

    const outputFile = `data/test-highlights-${today}.json`;
    writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`\n✅ Done! Output saved to: ${outputFile}`);
    console.log(`📦 ${validMatches.length} highlights with CDN video sources`);
    console.log(`\n📄 JSON Preview:`);
    console.log(JSON.stringify(output, null, 2).substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

