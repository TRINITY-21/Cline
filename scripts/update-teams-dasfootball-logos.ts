/**
 * Script to update teams.json with dasfootball.com logos from scraped-highlights-enriched.json
 * Only dasfootball.com logos are kept - all other logos are removed or replaced
 * 
 * Usage: npm run update:dasfootball-logos
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
  logo?: string;
}

interface TeamData {
  name: string;
  logo: string;
  sport: string;
  normalizedName: string;
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
  return name
    .toLowerCase()
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

  // Contains date patterns
  if (/\d{4}/.test(trimmed) && (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(trimmed) || /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i.test(trimmed))) {
    return false;
  }

  // Contains metadata words
  const metadataWords = ['extended', 'preview', 'match', 'goals', '&amp;', '&'];
  const lower = trimmed.toLowerCase();
  if (metadataWords.some(word => lower.includes(word))) {
    return false;
  }

  // Contains HTML entities
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

function isDasfootballLogo(logoUrl: string | null | undefined): boolean {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  return logoUrl.includes('dasfootball.com');
}

function isValidTeamLogo(logoUrl: string | null | undefined): boolean {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  // Only accept dasfootball.com logos or local /logos/ logos
  return isDasfootballLogo(logoUrl) || logoUrl.startsWith('/logos/');
}

async function main() {
  const projectRoot = join(__dirname, '..');
  const enrichedPath = join(projectRoot, 'data', 'scraped-highlights-enriched.json');
  const teamsPath = join(projectRoot, 'data', 'teams.json');

  console.log('📚 Reading enriched highlights...');
  const enrichedHighlights: EnrichedHighlight[] = JSON.parse(readFileSync(enrichedPath, 'utf-8'));
  console.log(`📖 Found ${enrichedHighlights.length} enriched highlights`);

  console.log('📚 Reading existing teams catalog...');
  const existingTeams: TeamCatalogItem[] = JSON.parse(readFileSync(teamsPath, 'utf-8'));
  console.log(`📖 Found ${existingTeams.length} existing teams in catalog`);

  const dasfootballLogos = new Map<string, TeamData>();
  let processed = 0;
  let dasfootballLogoCount = 0;

  console.log('🔍 Extracting dasfootball.com logos from enriched data...');
  for (const match of enrichedHighlights) {
    processed++;
    if (processed % 10000 === 0) {
      console.log(`   Processed ${processed}/${enrichedHighlights.length} matches...`);
    }

    const sport = determineSport(match.league, match.category);

    // Process home team - ONLY dasfootball logos
    if (match.homeTeam && match.logos?.homeTeam) {
      const teamName = match.homeTeam.trim();
      const logoUrl = match.logos.homeTeam;
      
      if (teamName && isValidTeamName(teamName) && isDasfootballLogo(logoUrl)) {
        const normalized = normalizeName(teamName);
        const existing = dasfootballLogos.get(normalized);

        // Only use dasfootball logos
        if (!existing || !isDasfootballLogo(existing.logo)) {
          dasfootballLogos.set(normalized, {
            name: teamName,
            logo: logoUrl,
            sport,
            normalizedName: normalized,
          });
          dasfootballLogoCount++;
        }
      }
    }

    // Process away team - ONLY dasfootball logos
    if (match.awayTeam && match.logos?.awayTeam) {
      const teamName = match.awayTeam.trim();
      const logoUrl = match.logos.awayTeam;
      
      if (teamName && isValidTeamName(teamName) && isDasfootballLogo(logoUrl)) {
        const normalized = normalizeName(teamName);
        const existing = dasfootballLogos.get(normalized);

        // Only use dasfootball logos
        if (!existing || !isDasfootballLogo(existing.logo)) {
          dasfootballLogos.set(normalized, {
            name: teamName,
            logo: logoUrl,
            sport,
            normalizedName: normalized,
          });
          dasfootballLogoCount++;
        }
      }
    }
  }

  console.log(`✅ Found ${dasfootballLogos.size} unique teams with dasfootball logos`);

  // Merge with existing teams
  let addedCount = 0;
  let updatedCount = 0;
  let removedCount = 0;
  let keptCount = 0;

  const finalTeamsMap = new Map<string, TeamCatalogItem>();
  
  // First, add all existing teams but remove invalid logos
  existingTeams.forEach(team => {
    const normalized = normalizeName(team.name);
    const currentLogo = team.logo || '';
    
    // Keep team if logo is valid (dasfootball or local), otherwise remove logo
    if (isValidTeamLogo(currentLogo)) {
      finalTeamsMap.set(normalized, team);
      keptCount++;
    } else if (currentLogo) {
      // Logo exists but is invalid - remove it
      finalTeamsMap.set(normalized, {
        ...team,
        logo: undefined, // Remove invalid logo
      });
      removedCount++;
    } else {
      // No logo - keep team
      finalTeamsMap.set(normalized, team);
    }
  });

  // Then, update with dasfootball logos from enriched data
  for (const [normalizedName, dasfootballTeamData] of dasfootballLogos.entries()) {
    const existing = finalTeamsMap.get(normalizedName);
    if (existing) {
      // Update existing team with dasfootball logo
      const currentLogo = existing.logo || '';
      
      // Only update if:
      // 1. Team has no logo, OR
      // 2. Current logo is not dasfootball and not local
      if (!currentLogo || !isValidTeamLogo(currentLogo)) {
        finalTeamsMap.set(normalizedName, {
          ...existing,
          logo: dasfootballTeamData.logo,
          sport: existing.sport || dasfootballTeamData.sport,
        });
        console.log(`   ✏️  Updated logo for: ${existing.name}`);
        updatedCount++;
      } else if (!isDasfootballLogo(currentLogo) && isDasfootballLogo(dasfootballTeamData.logo)) {
        // Replace non-dasfootball logo with dasfootball logo
        finalTeamsMap.set(normalizedName, {
          ...existing,
          logo: dasfootballTeamData.logo,
        });
        console.log(`   🔄 Replaced logo for: ${existing.name}`);
        updatedCount++;
      }
    } else {
      // Add new team with dasfootball logo
      finalTeamsMap.set(normalizedName, {
        id: generateTeamId(dasfootballTeamData.name),
        name: dasfootballTeamData.name,
        sport: dasfootballTeamData.sport,
        logo: dasfootballTeamData.logo,
        aliases: [],
      });
      console.log(`   ➕ Added new team: ${dasfootballTeamData.name} (${dasfootballTeamData.sport})`);
      addedCount++;
    }
  }

  const finalTeams = Array.from(finalTeamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\n📊 Summary:`);
  console.log(`   ➕ Added: ${addedCount} new teams with dasfootball logos`);
  console.log(`   ✏️  Updated: ${updatedCount} teams with dasfootball logos`);
  console.log(`   🗑️  Removed: ${removedCount} invalid logos (non-dasfootball, non-local)`);
  console.log(`   ✅ Kept: ${keptCount} teams with valid logos`);
  console.log(`   📦 Total teams in catalog: ${finalTeams.length}`);
  console.log(`   🎯 Teams with dasfootball logos: ${finalTeams.filter(t => isDasfootballLogo(t.logo)).length}`);
  console.log(`   🏠 Teams with local logos: ${finalTeams.filter(t => t.logo?.startsWith('/logos/')).length}`);
  console.log(`   ❌ Teams without logos: ${finalTeams.filter(t => !t.logo).length}`);

  console.log('\n💾 Writing updated teams.json...');
  writeFileSync(teamsPath, JSON.stringify(finalTeams, null, 2) + '\n');
  console.log('✅ Done! teams.json has been updated with only dasfootball.com and local logos.');
}

main().catch(console.error);

