import fs from 'fs';
import path from 'path';

interface ScrapedMatch {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  [key: string]: any;
}

function cleanTeamName(name: string): string {
  if (!name) return name;
  return name
    .replace(/HIGHLIGHTS:\s*/gi, '')
    .replace(/Highlights/gi, '')
    .replace(/Video Highlights/gi, '')
    .replace(/Highlights and Goals/gi, '')
    .replace(/and Stats/gi, '')
    .replace(/video Goals/gi, '')
    .replace(/Stats/gi, '')
    .replace(/and\s+Video/gi, '')
    .replace(/Video\s+Goals/gi, '')
    .replace(/\s+Video\s*$/gi, '') // Remove "Video" at the end
    .replace(/^Video\s+/gi, '') // Remove "Video" at the start
    .replace(/\s+Video\s+/gi, ' ') // Remove "Video" in the middle
    .replace(/\bVideo\b/gi, '') // Remove standalone "Video" word
    .replace(/\s+and\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(title: string, homeTeam?: string, awayTeam?: string): string {
  if (!title) return title;
  
  // Clean team names if provided
  const cleanHome = homeTeam ? cleanTeamName(homeTeam) : '';
  const cleanAway = awayTeam ? cleanTeamName(awayTeam) : '';
  
  // If we have team names, use them to create clean title
  if (cleanHome && cleanAway) {
    return `${cleanHome} vs ${cleanAway}`;
  }
  
  // Otherwise, clean the title
  let clean = title
    .replace(/HIGHLIGHTS:\s*/gi, '')
    .replace(/Highlights and Goals/gi, '')
    .replace(/Video Highlights/gi, '')
    .replace(/Highlights/gi, '')
    .replace(/and Stats/gi, '')
    .replace(/Stats/gi, '')
    .replace(/and\s+Video/gi, '')
    .replace(/\s+and\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Try to extract just team names
  const teamsMatch = clean.match(/(.+?)\s+vs\s+(.+?)$/i) || 
                       clean.match(/(.+?)\s+VS\s+(.+?)$/i);
  
  if (teamsMatch) {
    return `${cleanTeamName(teamsMatch[1])} vs ${cleanTeamName(teamsMatch[2])}`;
  }
  
  return clean;
}

async function main() {
  console.log('🧹 Cleaning titles in scraped data...\n');
  
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
    
    let cleanedCount = 0;
    
    matches.forEach(match => {
      // Clean team names
      const originalHome = match.homeTeam;
      const originalAway = match.awayTeam;
      match.homeTeam = cleanTeamName(match.homeTeam);
      match.awayTeam = cleanTeamName(match.awayTeam);
      
      if (match.homeTeam !== originalHome || match.awayTeam !== originalAway) {
        cleanedCount++;
      }
      
      // Clean title
      const originalTitle = match.title;
      const cleanedTitle = cleanTitle(match.title, match.homeTeam, match.awayTeam);
      
      if (cleanedTitle !== originalTitle) {
        match.title = cleanedTitle;
        cleanedCount++;
      }
    });
    
    // Save cleaned data
    fs.writeFileSync(file.path, JSON.stringify(matches, null, 2), 'utf-8');
    
    console.log(`✅ Cleaned ${cleanedCount} titles in ${file.name}`);
    console.log(`💾 Saved to ${file.path}\n`);
  }

  console.log(`\n✅ Title cleaning completed!`);
}

main().catch(console.error);

