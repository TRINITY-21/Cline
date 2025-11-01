import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface ScrapedMatch {
  id: string;
  url: string;
  videoSrc?: string;
  [key: string]: any;
}

async function findCorrectVideoUrl(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Strategy 1: Direct video tag with fp-engine class inside fp-player - MOST RELIABLE
    // This matches: <div class="fp-player"><video class="fp-engine" src="..."></video>
    const videoTag = $('.fp-player video.fp-engine').first();
    if (videoTag.length > 0) {
      let videoSrc = videoTag.attr('src') || '';
      if (videoSrc) {
        // Decode HTML entities
        videoSrc = videoSrc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        if (videoSrc.startsWith('https://cdn-cf-east.streamable.com/')) {
          return videoSrc;
        }
      }
    }
    
    // Strategy 2: Fallback - any video.fp-engine tag
    const videoTagFallback = $('video.fp-engine').first();
    if (videoTagFallback.length > 0) {
      let videoSrc = videoTagFallback.attr('src') || '';
      if (videoSrc) {
        videoSrc = videoSrc.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        if (videoSrc.startsWith('https://cdn-cf-east.streamable.com/')) {
          return videoSrc;
        }
      }
    }
    
    // Strategy 3: Search HTML for CDN URLs as last resort
    const cdnUrlPattern = /https:\/\/cdn-cf-east\.streamable\.com\/video\/mp4\/[^\s"'<>]+/gi;
    const cdnMatches = html.match(cdnUrlPattern);
    
    if (cdnMatches && cdnMatches.length > 0) {
      // Use the first CDN URL found, prefer the full URL with query params
      const fullUrl = cdnMatches.find(url => url.includes('?')) || cdnMatches[0];
      return fullUrl;
    }
    
    return null;
  } catch (error) {
    console.error(`  ❌ Error fetching ${pageUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  console.log('🔧 Fixing Google video URLs in scraped data...\n');
  
  const enrichedPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  const basicPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
  
  const files = [
    { path: enrichedPath, name: 'scraped-highlights-enriched.json' },
    { path: basicPath, name: 'scraped-highlights.json' }
  ].filter(f => fs.existsSync(f.path));

  if (files.length === 0) {
    console.error('❌ No files found to process');
    return;
  }

  for (const file of files) {
    console.log(`📖 Processing ${file.name}...`);
    const rawData = fs.readFileSync(file.path, 'utf-8');
    const matches: ScrapedMatch[] = JSON.parse(rawData);
    
    const googleUrlMatches = matches.filter(m => 
      m.videoSrc && m.videoSrc.startsWith('https://www.google.com/')
    );
    
    console.log(`  Found ${googleUrlMatches.length} matches with Google URLs\n`);
    
    if (googleUrlMatches.length === 0) {
      console.log(`  ✅ No Google URLs found in ${file.name}\n`);
      continue;
    }
    
    let fixedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < googleUrlMatches.length; i++) {
      const match = googleUrlMatches[i];
      console.log(`  [${i + 1}/${googleUrlMatches.length}] Fixing ${match.id}...`);
      
      if (!match.url) {
        console.log(`  ⚠️ No URL found for match, skipping`);
        failedCount++;
        continue;
      }
      
      const correctUrl = await findCorrectVideoUrl(match.url);
      
      if (correctUrl) {
        // Update the match in the original array
        const matchIndex = matches.findIndex(m => m.id === match.id);
        if (matchIndex !== -1) {
          matches[matchIndex].videoSrc = correctUrl;
          fixedCount++;
          console.log(`  ✅ Fixed: ${correctUrl.substring(0, 80)}...`);
        }
      } else {
        console.log(`  ❌ Could not find correct video URL`);
        failedCount++;
      }
      
      // Add a small delay to avoid rate limiting
      if (i < googleUrlMatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Save updated data
    fs.writeFileSync(file.path, JSON.stringify(matches, null, 2), 'utf-8');
    
    console.log(`\n✅ Fixed ${fixedCount} URLs in ${file.name}`);
    console.log(`⚠️ Failed to fix ${failedCount} URLs`);
    console.log(`💾 Saved to ${file.path}\n`);
  }

  console.log(`\n✅ Google URL fixing completed!`);
}

main().catch(console.error);

