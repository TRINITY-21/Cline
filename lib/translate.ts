/**
 * Translation utility for translating Turkish text to English
 * Uses Google Cloud Translate API if available, falls back to a simple fetch-based approach
 */

const CACHE = new Map<string, string>();

/**
 * Translate text from Turkish to English
 * Uses caching to avoid redundant API calls
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  
  const trimmed = text.trim();
  if (!trimmed) return text;
  
  // Check cache first
  if (CACHE.has(trimmed)) {
    return CACHE.get(trimmed)!;
  }
  
  // Check if text is already in English (no Turkish characters)
  // Turkish has specific characters: ğ, Ğ, ş, Ş, ı, İ, ü, Ü, ö, Ö, ç, Ç
  const turkishChars = /[ğĞşŞıİüÜöÖçÇ]/;
  if (!turkishChars.test(trimmed)) {
    // Likely already in English or doesn't need translation
    CACHE.set(trimmed, trimmed);
    return trimmed;
  }
  
  try {
    // Use Google Translate free API
    const translated = await translateWithGoogleFreeAPI(trimmed);
    if (translated && translated !== trimmed) {
      CACHE.set(trimmed, translated);
      return translated;
    }
    
    // If translation fails, return original
    CACHE.set(trimmed, trimmed);
    return trimmed;
  } catch (error) {
    console.warn(`Translation failed for "${trimmed}":`, error);
    // Return original text if translation fails
    CACHE.set(trimmed, trimmed);
    return trimmed;
  }
}

/**
 * Translate using Google Translate free API endpoint
 * Note: This is less reliable and may have rate limits
 */
async function translateWithGoogleFreeAPI(text: string): Promise<string | null> {
  try {
    // Using a free translation service API endpoint
    // This is a simple approach - in production you might want to use a paid service
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=tr&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]?.[0]) {
        const translated = data[0][0][0];
        // Ensure we got a valid translation (not empty, not same as original)
        if (translated && translated.trim() && translated.trim() !== text.trim()) {
          return translated.trim();
        }
      }
      
      return null;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn('Translation request timeout');
      }
      throw fetchError;
    }
  } catch (error) {
    console.warn('Free translation API failed:', error);
    return null;
  }
}

/**
 * Translate match data (team names and league name)
 */
export async function translateMatch(match: any): Promise<any> {
  if (!match) return match;
  
  const translated: any = { ...match };
  
  // Translate team names
  if (match.home?.name) {
    translated.home = {
      ...match.home,
      name: await translateToEnglish(match.home.name),
    };
  }
  
  if (match.away?.name) {
    translated.away = {
      ...match.away,
      name: await translateToEnglish(match.away.name),
    };
  }
  
  // Translate league name
  if (match.league?.name) {
    translated.league = {
      ...match.league,
      name: await translateToEnglish(match.league.name),
    };
  }
  
  return translated;
}

/**
 * Translate multiple matches in batch (with rate limiting)
 */
export async function translateMatches(matches: any[]): Promise<any[]> {
  if (!Array.isArray(matches) || matches.length === 0) return matches;
  
  // Process in batches to avoid rate limits
  const batchSize = 5; // Smaller batches to avoid rate limits
  const translated: any[] = [];
  
  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    const translatedBatch = await Promise.all(
      batch.map(match => translateMatch(match))
    );
    translated.push(...translatedBatch);
    
    // Delay between batches to avoid rate limits (longer delay for free API)
    if (i + batchSize < matches.length) {
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
    }
  }
  
  return translated;
}

