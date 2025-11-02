import { readFileSync } from 'fs';
import path from 'path';

/**
 * Check if a date string is in October
 */
function isOctoberDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  
  try {
    const date = new Date(dateStr);
    // Check if date is valid and month is October (month is 0-indexed, so October is 9)
    if (!isNaN(date.getTime())) {
      return date.getMonth() === 9; // October is month 9 (0-indexed)
    }
    
    // Try parsing common date formats
    // Check for "October" or "Oct" in the string
    const lowerDate = dateStr.toLowerCase();
    if (lowerDate.includes('october') || lowerDate.includes('oct')) {
      return true;
    }
    
    // Try DD-MM-YYYY or YYYY-MM-DD formats
    const parts = dateStr.split(/[-/\s]/);
    if (parts.length >= 2) {
      // Try to find month component
      let monthStr = parts[1];
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        monthStr = parts[1];
      } else {
        // DD-MM-YYYY format
        monthStr = parts[1];
      }
      
      const month = parseInt(monthStr, 10);
      if (!isNaN(month) && month === 10) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

function analyzeHighlights() {

  try {
    // Try enriched file first
    const enrichedPath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
    let allMatches: any[] = [];
    
    try {
      const fileContent = readFileSync(enrichedPath, 'utf-8');
      allMatches = JSON.parse(fileContent);
    } catch (enrichedError) {
      // Fallback to basic file
      const basicPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
      try {
        const fileContent = readFileSync(basicPath, 'utf-8');
        allMatches = JSON.parse(fileContent);
      } catch (basicError) {
        return;
      }
    }

    // Filter for October
    const octoberMatches = allMatches.filter((match: any) => isOctoberDate(match.date));

    // Filter for those with videoSrc
    const withVideoSrc = octoberMatches.filter((match: any) => {
      const videoSrc = match.videoSrc || '';
      return videoSrc && typeof videoSrc === 'string' && videoSrc.trim().length > 0;
    });

    // Filter for those with "cdn" in videoSrc
    const withCdn = octoberMatches.filter((match: any) => {
      const videoSrc = match.videoSrc || '';
      return videoSrc && typeof videoSrc === 'string' && videoSrc.toLowerCase().includes('cdn');
    });

    // Show breakdown by date
    const dateGroups: Record<string, number> = {};
    withCdn.forEach((match: any) => {
      const date = match.date || 'Unknown';
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });

    const sortedDates = Object.entries(dateGroups)
      .sort((a, b) => {
        try {
          const dateA = new Date(a[0]).getTime();
          const dateB = new Date(b[0]).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
            return dateA - dateB;
          }
          return a[0].localeCompare(b[0]);
        } catch {
          return a[0].localeCompare(b[0]);
        }
      });

    sortedDates.forEach(([date, count]) => {
    });

    // Show sample matches (first 5)
    withCdn.slice(0, 5).forEach((match: any, idx: number) => {
    });

    // Show stats

  } catch (error) {
  }
}

analyzeHighlights();

