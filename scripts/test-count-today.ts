/**
 * Quick test script to count matches for today
 * Just outputs the count, no JSON
 */

import * as cheerio from 'cheerio';

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.getFullYear() === today.getFullYear() && 
             date.getMonth() === today.getMonth() && 
             date.getDate() === today.getDate();
    }
    
    const lowerDate = dateStr.toLowerCase();
    const todayLower = todayStr.toLowerCase();
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const todayMonthName = monthNames[today.getMonth()];
    
    if (lowerDate.includes(todayMonthName) && lowerDate.includes(String(today.getDate()))) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

async function countTodayMatches(): Promise<number> {
  
  const matchLinks: string[] = [];
  const maxPages = 5; // Check first 5 pages
  
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
              fullUrl.includes('match-highlights-') &&
              !fullUrl.includes('category') && 
              !fullUrl.includes('tag')) {
            
            // Check date from URL first (most reliable)
            const urlDateMatch = fullUrl.match(/-(\d{4})-(\d{2})-(\d{2})/);
            let isMatchToday = false;
            
            if (urlDateMatch) {
              const [, year, month, day] = urlDateMatch;
              try {
                const matchDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
                const today = new Date();
                isMatchToday = matchDate.getFullYear() === today.getFullYear() &&
                              matchDate.getMonth() === today.getMonth() &&
                              matchDate.getDate() === today.getDate();
              } catch {
                // Fall through
              }
            }
            
            // If not found in URL, check date on the article
            if (!isMatchToday) {
              const dateText = $(element).find('.kp-date, time, [datetime]').first().text().trim() ||
                             $(element).find('time').attr('datetime') || '';
              
              if (dateText && isToday(dateText)) {
                isMatchToday = true;
              }
            }
            
            if (isMatchToday) {
              const cleanUrl = fullUrl.split('#')[0].split('?')[0];
              if (!matchLinks.includes(cleanUrl)) {
                matchLinks.push(cleanUrl);
                foundToday = true;
              }
            }
          }
        }
      });
      
      if (!foundToday && page > 1) {
        break;
      }
      
      await waitFor(500);
    } catch (error) {
      break;
    }
  }
  
  return matchLinks.length;
}

async function main() {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  
  try {
    const count = await countTodayMatches();
  } catch (error) {
    process.exit(1);
  }
}

main();

