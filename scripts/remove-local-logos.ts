/**
 * Script to remove all /logos/ entries from teams.json
 * Only keeps dasfootball.com logos
 * 
 * Usage: npm run remove:local-logos
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TeamCatalogItem {
  id: string;
  sport: string;
  name: string;
  aliases?: string[];
  logo?: string;
}

function isDasfootballLogo(logoUrl: string | null | undefined): boolean {
  if (!logoUrl || typeof logoUrl !== 'string') return false;
  return logoUrl.includes('dasfootball.com');
}

async function main() {
  const projectRoot = join(__dirname, '..');
  const teamsPath = join(projectRoot, 'data', 'teams.json');

  console.log('📚 Reading teams.json...');
  const teams: TeamCatalogItem[] = JSON.parse(readFileSync(teamsPath, 'utf-8'));
  console.log(`📖 Found ${teams.length} teams`);

  let removedCount = 0;
  let keptCount = 0;
  let noLogoCount = 0;

  // Remove /logos/ entries, keep only dasfootball.com logos
  const updatedTeams = teams.map(team => {
    const currentLogo = team.logo || '';
    
    if (!currentLogo) {
      noLogoCount++;
      return team; // No logo, keep as is
    }
    
    if (currentLogo.startsWith('/logos/')) {
      // Remove local logo
      removedCount++;
      return {
        ...team,
        logo: undefined,
      };
    }
    
    if (isDasfootballLogo(currentLogo)) {
      // Keep dasfootball logo
      keptCount++;
      return team;
    }
    
    // Not dasfootball and not local - remove it
    removedCount++;
    return {
      ...team,
      logo: undefined,
    };
  });

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Kept: ${keptCount} teams with dasfootball.com logos`);
  console.log(`   🗑️  Removed: ${removedCount} local /logos/ and invalid logos`);
  console.log(`   📦 No logo: ${noLogoCount} teams (already had no logo)`);
  console.log(`   📦 Total teams: ${updatedTeams.length}`);

  console.log('\n💾 Writing updated teams.json...');
  writeFileSync(teamsPath, JSON.stringify(updatedTeams, null, 2) + '\n');
  console.log('✅ Done! All /logos/ entries have been removed. Only dasfootball.com logos remain.');
}

main().catch(console.error);

