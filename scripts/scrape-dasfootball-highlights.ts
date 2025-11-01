import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

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
let db: any;

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
        const fileData = fs.readFileSync(filePath, 'utf8');
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
    
    db = admin.firestore();
  }
  return { admin, db };
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

async function scrapeHomepage(): Promise<string[]> {
  console.log('📄 Scraping homepage for match links...');
  
  const matchLinks: Set<string> = new Set();
  let page = 1;
  let hasMore = true;
  const maxPages = 200; // Safety limit

  while (hasMore && page <= maxPages) {
    try {
      // Try different URL patterns for pagination
      let url = 'https://dasfootball.com/';
      if (page > 1) {
        url = `https://dasfootball.com/page/${page}/`;
      }
      
      console.log(`Fetching page ${page}...`);
      const html = await fetchHTML(url);
      const $ = cheerio.load(html);
      
      // Extract match links from articles
      let foundOnPage = 0;
      
      $('article.grid-posts-item, article[class*="post"]').each((_, element) => {
        const link = $(element).find('a[href*="/"]').first().attr('href');
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `https://dasfootball.com${link}`;
          if (fullUrl.includes('dasfootball.com/') && 
              !fullUrl.includes('category') && 
              !fullUrl.includes('tag') &&
              !fullUrl.includes('#') &&
              fullUrl !== 'https://dasfootball.com/' &&
              !fullUrl.endsWith('/category/') &&
              !fullUrl.endsWith('/tag/')) {
            matchLinks.add(fullUrl.split('#')[0].split('?')[0]);
            foundOnPage++;
          }
        }
      });
      
      // Also check h2/h1 links
      $('h2 a[href], h1 a[href]').each((_, element) => {
        const link = $(element).attr('href');
        if (link) {
          const fullUrl = link.startsWith('http') ? link : `https://dasfootball.com${link}`;
          if (fullUrl.includes('dasfootball.com/') && 
              !fullUrl.includes('category') && 
              !fullUrl.includes('tag')) {
            matchLinks.add(fullUrl.split('#')[0].split('?')[0]);
          }
        }
      });
      
      console.log(`  Found ${foundOnPage} matches on page ${page} (Total: ${matchLinks.size})`);
      
      // Check if there's a next page or load more button
      const nextPage = $('a.next, .pagination a:contains("Next"), .load-more').first();
      if (foundOnPage === 0 && page > 1) {
        hasMore = false;
      } else if (nextPage.length === 0) {
        // Try to find if there are more pages by checking if we got matches
        if (foundOnPage === 0) {
          hasMore = false;
        } else {
          page++;
          await waitFor(1000); // Small delay between pages
        }
      } else {
        page++;
        await waitFor(1000);
      }
      
      // Safety: if we've seen this many matches and no new ones on last page, stop
      if (foundOnPage === 0 && matchLinks.size > 0) {
        hasMore = false;
      }
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error);
      hasMore = false;
    }
  }

  const uniqueLinks = Array.from(matchLinks);
  console.log(`✅ Total unique matches found: ${uniqueLinks.length}`);
  return uniqueLinks;
}

function extractMatchId(url: string): string {
  const match = url.match(/dasfootball\.com\/([^\/]+)\/?$/);
  if (match) {
    return match[1].replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }
  return url.split('/').filter(Boolean).pop()?.replace(/[^a-z0-9-]/gi, '-') || Date.now().toString();
}

async function scrapeMatchDetails(url: string): Promise<ScrapedMatch | null> {
  try {
    console.log(`\n🔍 Scraping: ${url}`);
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    
    const matchData: Partial<ScrapedMatch> = {
      id: extractMatchId(url),
      url: url,
    };

    // Extract title
    const title = $('h1.page-title, h1').first().text().trim() || 
                  $('h1').text().trim();
    if (title) {
      // Clean title: remove "HIGHLIGHTS:", "Video Highlights", "Highlights and Goals", "and Stats", etc.
      let cleanTitle = title
        .replace(/HIGHLIGHTS:\s*/gi, '')
        .replace(/Highlights and Goals/gi, '')
        .replace(/Video Highlights/gi, '')
        .replace(/Highlights/gi, '')
        .replace(/and Stats/gi, '')
        .replace(/Stats/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract teams from cleaned title
      const teamsMatch = cleanTitle.match(/(.+?)\s+vs\s+(.+?)$/i) || 
                         cleanTitle.match(/(.+?)\s+VS\s+(.+?)$/i);
      
      if (teamsMatch) {
        matchData.homeTeam = teamsMatch[1].trim();
        matchData.awayTeam = teamsMatch[2].trim();
        // Set title to just the team names
        matchData.title = `${matchData.homeTeam} vs ${matchData.awayTeam}`;
      } else {
        // If no match found, use cleaned title as-is
        matchData.title = cleanTitle;
      }
    }

    // Extract league
    const league = $('.kp-league-name, [class*="league"]').first().text().trim() ||
                   $('.grid-posts-category, [class*="category"]').first().text().trim();
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
      matchData.homeTeam = cleanTeamName(matchData.homeTeam);
      matchData.awayTeam = cleanTeamName(matchData.awayTeam);
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

    // Extract video source
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

    // Only return if we have essential data
    if (!matchData.homeTeam || !matchData.awayTeam) {
      console.log(`⚠️ Missing team data for ${url}`);
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
    console.error(`❌ Error scraping ${url}:`, error);
    return null;
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

async function saveBatchToFirestore(matches: ScrapedMatch[], firestoreDb: any): Promise<void> {
  if (matches.length === 0) return;
  
  const collectionRef = firestoreDb.collection('highlights');
  const batch = firestoreDb.batch();
  
  for (const match of matches) {
    const docRef = collectionRef.doc(match.id);
    // Remove undefined fields before saving to Firestore
    const cleanedMatch = removeUndefinedFields(match);
    batch.set(docRef, cleanedMatch, { merge: true });
  }
  
  await batch.commit();
  console.log(`  💾 Saved batch of ${matches.length} matches to Firestore`);
}

async function saveToJSON(matches: ScrapedMatch[], filename: string = 'scraped-highlights.json') {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, filename);
  // Remove undefined fields before saving
  const cleanedMatches = matches.map(removeUndefinedFields);
  fs.writeFileSync(filePath, JSON.stringify(cleanedMatches, null, 2), 'utf-8');
  console.log(`✅ Saved ${matches.length} matches to ${filePath}`);
  if (fs.existsSync(filePath)) {
    console.log(`📊 JSON file size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
  }
}

async function main() {
  console.log('🚀 Starting DasFootball scraper (HTTP requests)...\n');
  
  // Initialize Firebase
  const { db: firestoreDb } = await initFirebase();
  
  try {
    // Step 1: Scrape homepage for all match links
    const matchLinks = await scrapeHomepage();
    
    if (matchLinks.length === 0) {
      console.log('❌ No matches found!');
      return;
    }

    console.log(`\n📋 Found ${matchLinks.length} matches to scrape\n`);

    // Step 2: Scrape details for each match and save in batches
    const allScrapedMatches: ScrapedMatch[] = [];
    const BATCH_SIZE = 10; // Save every 10 matches
    let successCount = 0;
    let errorCount = 0;
    let currentBatch: ScrapedMatch[] = [];

    for (let i = 0; i < matchLinks.length; i++) {
      const link = matchLinks[i];
      console.log(`[${i + 1}/${matchLinks.length}] Processing: ${link}`);
      
      const matchData = await scrapeMatchDetails(link);
      
      if (matchData) {
        allScrapedMatches.push(matchData);
        currentBatch.push(matchData);
        successCount++;
        console.log(`✅ Successfully scraped: ${matchData.title || matchData.id}`);
        
        // Save batch every 10 matches
        if (currentBatch.length >= BATCH_SIZE) {
          await saveBatchToFirestore(currentBatch, firestoreDb);
          await saveToJSON(allScrapedMatches); // Update JSON file
          currentBatch = []; // Clear batch
          console.log(`  💾 Progress saved: ${allScrapedMatches.length} total matches saved`);
        }
      } else {
        errorCount++;
        console.log(`❌ Failed to scrape: ${link}`);
      }

      // Small delay between requests
      await waitFor(800);
    }

    // Save any remaining matches in the batch
    if (currentBatch.length > 0) {
      await saveBatchToFirestore(currentBatch, firestoreDb);
    }

    // Final save to JSON
    if (allScrapedMatches.length > 0) {
      await saveToJSON(allScrapedMatches);
    }

    console.log(`\n\n📊 Scraping Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📦 Total saved: ${allScrapedMatches.length}`);
    console.log(`💾 All matches saved to Firestore collection "highlights"!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    console.log('\n✅ Scraping completed!');
  }
}

// Run the scraper
main().catch(console.error);
