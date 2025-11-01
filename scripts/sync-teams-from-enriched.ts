/**
 * Script to sync team names and logos from scraped-highlights-enriched.json to teams.json
 * This ensures teams.json is kept up-to-date with all teams and logos found in enriched highlights
 * 
 * Usage: npm run sync:teams
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EnrichedHighlight {
  homeTeam?: string;
  awayTeam?: string;
  logos?: {
    homeTeam?: string;
    awayTeam?: string;
    league?: string;
  };
  league?: string;
  category?: string;
}

interface TeamCatalogItem {
  id: string;
  sport: string;
  name: string;
  aliases?: string[];
  logo: string;
}

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/fc|cf|sc|bc|ac|\bclub\b|\bthe\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateTeamId(name: string): string {
  return normalizeName(name)
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/gi, '')
    .replace(/^-|-$/g, '');
}

function determineSport(league: string | undefined, category: string | undefined): string {
  const leagueLower = (league || '').toLowerCase();
  const categoryLower = (category || '').toLowerCase();
  const combined = `${leagueLower} ${categoryLower}`.toLowerCase();
  
  if (combined.includes('hockey') || combined.includes('ice hockey')) {
    return 'Hockey';
  }
  if (combined.includes('basketball') || combined.includes('nba')) {
    return 'Basketball';
  }
  if (combined.includes('volleyball') || combined.includes('vball')) {
    return 'Volleyball';
  }
  if (combined.includes('tennis')) {
    return 'Tennis';
  }
  // Default to Football
  return 'Football';
}

function isValidTeamName(name: string): boolean {
  const trimmed = name.trim();
  
  // Too short or too long
  if (trimmed.length < 2 || trimmed.length > 50) {
    return false;
  }
  
  // Contains date patterns (e.g., "2025", "01/02/2025", "20 Jun 2025", "– 20 Jun 2025")
  if (/\d{4}/.test(trimmed) && (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(trimmed) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i.test(trimmed))) {
    return false;
  }
  
  // Contains "Extended", "Preview", "Match", "Goals" etc (metadata)
  const metadataWords = ['extended', 'preview', 'match', 'goals', '&amp;', '&'];
  const lower = trimmed.toLowerCase();
  if (metadataWords.some(word => lower.includes(word))) {
    return false;
  }
  
  // Contains HTML entities that weren't cleaned
  if (trimmed.includes('&amp;') || trimmed.includes('&nbsp;')) {
    return false;
  }
  
  // Contains only numbers or special characters
  if (/^[\d\s\-\.\/]+$/.test(trimmed)) {
    return false;
  }
  
  // Contains "–" followed by date-like patterns
  if (/–\s*\d/.test(trimmed)) {
    return false;
  }
  
  return true;
}

async function main() {
  const projectRoot = join(__dirname, '..');
  const enrichedPath = join(projectRoot, 'data', 'scraped-highlights-enriched.json');
  const teamsPath = join(projectRoot, 'data', 'teams.json');
  
  console.log('📚 Reading enriched highlights...');
  const enrichedContent = readFileSync(enrichedPath, 'utf-8');
  const enrichedHighlights: EnrichedHighlight[] = JSON.parse(enrichedContent);
  
  console.log(`📖 Found ${enrichedHighlights.length} enriched highlights`);
  
  console.log('📚 Reading existing teams catalog...');
  const teamsContent = readFileSync(teamsPath, 'utf-8');
  const existingTeams: TeamCatalogItem[] = JSON.parse(teamsContent);
  
  console.log(`📖 Found ${existingTeams.length} existing teams in catalog`);
  
  // Create a map of existing teams by normalized name for quick lookup
  const existingTeamsMap = new Map<string, TeamCatalogItem>();
  const existingTeamsById = new Map<string, TeamCatalogItem>();
  
  existingTeams.forEach(team => {
    const normalized = normalizeName(team.name);
    if (!existingTeamsMap.has(normalized)) {
      existingTeamsMap.set(normalized, team);
    }
    existingTeamsById.set(team.id, team);
  });
  
  // Extract teams and logos from enriched data
  const teamsFromEnriched = new Map<string, {
    name: string;
    logo: string;
    sport: string;
    normalizedName: string;
  }>();
  
  console.log('🔍 Extracting teams and logos from enriched data...');
  let processed = 0;
  
  for (const match of enrichedHighlights) {
    processed++;
    if (processed % 1000 === 0) {
      console.log(`   Processed ${processed}/${enrichedHighlights.length} matches...`);
    }
    
    const sport = determineSport(match.league, match.category);
    
    // Process home team
    if (match.homeTeam && match.logos?.homeTeam) {
      const teamName = match.homeTeam.trim();
      if (teamName && match.logos.homeTeam && isValidTeamName(teamName)) {
        const normalized = normalizeName(teamName);
        const existing = teamsFromEnriched.get(normalized);
        
        // Only update if we don't have this team yet, or if current logo is empty/invalid
        if (!existing || !existing.logo || existing.logo.trim() === '') {
          teamsFromEnriched.set(normalized, {
            name: teamName,
            logo: match.logos.homeTeam,
            sport,
            normalizedName: normalized,
          });
        }
      }
    }
    
    // Process away team
    if (match.awayTeam && match.logos?.awayTeam) {
      const teamName = match.awayTeam.trim();
      if (teamName && match.logos.awayTeam && isValidTeamName(teamName)) {
        const normalized = normalizeName(teamName);
        const existing = teamsFromEnriched.get(normalized);
        
        // Only update if we don't have this team yet, or if current logo is empty/invalid
        if (!existing || !existing.logo || existing.logo.trim() === '') {
          teamsFromEnriched.set(normalized, {
            name: teamName,
            logo: match.logos.awayTeam,
            sport,
            normalizedName: normalized,
          });
        }
      }
    }
  }
  
  console.log(`✅ Extracted ${teamsFromEnriched.size} unique teams from enriched data`);
  
  // Merge with existing teams
  let added = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const [, enrichedTeam] of teamsFromEnriched) {
    const normalized = enrichedTeam.normalizedName;
    const existing = existingTeamsMap.get(normalized);
    
    if (existing) {
      // Team exists - update logo if it's missing or empty
      if (!existing.logo || existing.logo.trim() === '' || existing.logo === '/logos/placeholder.png') {
        existing.logo = enrichedTeam.logo;
        updated++;
        console.log(`   ✏️  Updated logo for: ${existing.name}`);
      } else {
        skipped++;
      }
    } else {
      // New team - add it
      const teamId = generateTeamId(enrichedTeam.name);
      
      // Check if ID already exists (different team with same normalized name but different ID)
      let finalId = teamId;
      let counter = 1;
      while (existingTeamsById.has(finalId)) {
        finalId = `${teamId}-${counter}`;
        counter++;
      }
      
      const newTeam: TeamCatalogItem = {
        id: finalId,
        sport: enrichedTeam.sport,
        name: enrichedTeam.name,
        logo: enrichedTeam.logo,
        aliases: [],
      };
      
      existingTeams.push(newTeam);
      existingTeamsMap.set(normalized, newTeam);
      existingTeamsById.set(finalId, newTeam);
      added++;
      console.log(`   ➕ Added new team: ${enrichedTeam.name} (${enrichedTeam.sport})`);
    }
  }
  
  // Sort teams by sport, then by name
  existingTeams.sort((a, b) => {
    const sportCompare = a.sport.localeCompare(b.sport);
    if (sportCompare !== 0) return sportCompare;
    return a.name.localeCompare(b.name);
  });
  
  console.log('\n📊 Summary:');
  console.log(`   ➕ Added: ${added} new teams`);
  console.log(`   ✏️  Updated: ${updated} existing teams with logos`);
  console.log(`   ⏭️  Skipped: ${skipped} teams (already have logos)`);
  console.log(`   📦 Total teams in catalog: ${existingTeams.length}`);
  
  // Write updated teams.json
  console.log('\n💾 Writing updated teams.json...');
  writeFileSync(teamsPath, JSON.stringify(existingTeams, null, 2) + '\n', 'utf-8');
  
  console.log('✅ Done! teams.json has been updated.');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

