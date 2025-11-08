import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPSTREAM_BASE = 'https://cline-news.netlify.app/api/v2/news';
const ONEFOOTBALL_BASE = `${UPSTREAM_BASE}/OneFootball`;
const FOURFOURTWO_BASE = `${UPSTREAM_BASE}/FourFourtwo/bundesliga`;

function upgradeImage(url: string | undefined | null): string {
  const u = String(url || '').trim();
  if (!u) return '';
  
  // OneFootball image-service URLs - upgrade small dimensions (w=64&h=64) to larger ones
  if (/image-service\.onefootball\.com/.test(u)) {
    // Replace small dimensions with larger ones for better quality
    let upgraded = u
      .replace(/[?&]w=64(?!\d)/g, '&w=1200')
      .replace(/[?&]h=64(?!\d)/g, '&h=675')
      .replace(/[?&]w=\d+/g, (match) => {
        const w = parseInt(match.split('=')[1]);
        return w < 400 ? `&w=1200` : match;
      })
      .replace(/[?&]h=\d+/g, (match) => {
        const h = parseInt(match.split('=')[1]);
        return h < 400 ? `&h=675` : match;
      });
    
    // Ensure the first parameter uses ? instead of &
    const firstAmpersand = upgraded.indexOf('&');
    const firstQuestion = upgraded.indexOf('?');
    if (firstAmpersand !== -1 && (firstQuestion === -1 || firstAmpersand < firstQuestion)) {
      upgraded = upgraded.substring(0, firstAmpersand) + '?' + upgraded.substring(firstAmpersand + 1);
    }
    
    return upgraded;
  }
  
  // OneFootball direct image URLs - upgrade quality and dimensions
  if (/onefootball\.com|onefootballcdn\.com|img\.onefootball\.com/.test(u) && !/image-service\.onefootball\.com/.test(u)) {
    // Remove quality restrictions and increase dimensions
    let upgraded = u
      .replace(/[?&]q=\d+/g, '') // Remove quality restrictions
      .replace(/[?&]w=\d+/g, '') // Remove width restrictions
      .replace(/[?&]h=\d+/g, '') // Remove height restrictions
      .replace(/\/\d+x\d+\//g, '/1200x675/') // Replace small dimensions with larger ones
      .replace(/\/\d+x\d+_/g, '/1200x675_') // Replace dimensions in filename patterns
      .replace(/w_\d+/g, 'w_1200') // Replace width parameters in path
      .replace(/h_\d+/g, 'h_675'); // Replace height parameters in path
    
    // Add quality parameter if not present
    if (!upgraded.includes('?')) {
      upgraded += '?q=90';
    } else if (!upgraded.includes('q=')) {
      upgraded += '&q=90';
    }
    return upgraded;
  }
  
  // Common tiny thumbnails from minutemediacdn include w_16; bump to a sensible width
  if (/minutemediacdn\.com/.test(u)) {
    return u.replace(/w_16(?!\d)/g, 'w_1200');
  }
  
  // Generic pattern: w=16 in query
  if (/[?&]w=16(?!\d)/.test(u)) {
    return u.replace(/([?&]w=)16(?!\d)/, '$1800');
  }
  
  // Generic small dimension patterns
  if (/\/\d+x\d+\//.test(u)) {
    const match = u.match(/\/(\d+)x(\d+)\//);
    if (match) {
      const w = parseInt(match[1]);
      const h = parseInt(match[2]);
      // If dimensions are small (less than 400px), upgrade them
      if (w < 400 || h < 400) {
        const aspectRatio = h / w;
        const newWidth = 1200;
        const newHeight = Math.round(newWidth * aspectRatio);
        return u.replace(/\/\d+x\d+\//, `/${newWidth}x${newHeight}/`);
      }
    }
  }
  
  return u;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') || '').trim();

    if (!source) {
      // Return list of sources as [{ title: string }]
      const res = await fetch(UPSTREAM_BASE, { cache: 'no-store' });
      if (!res.ok) return NextResponse.json({ sources: [], error: `Upstream error: ${res.status}` }, { status: 502 });
      const json = await res.json();
      interface SourceItem {
        title?: string;
      }
      const sources = Array.isArray(json) 
        ? (json as SourceItem[]).map((s) => String(s?.title || '').trim()).filter(Boolean) 
        : [];
      return NextResponse.json({ sources });
    }

    // Fetch articles for a specific source (special-case certain sources)
    const upstreamUrl = (() => {
      const s = source.trim();
      const norm = s.toLowerCase().replace(/\s+/g, '');
      // OneFootball: handle labels like "One Football"
      if (norm === 'onefootball') return ONEFOOTBALL_BASE;
      // FourFourTwo: handle variants like "Four Four Two"
      if (norm === 'fourfourtwo') return FOURFOURTWO_BASE;
      // Default: direct passthrough
      return `${UPSTREAM_BASE}/${encodeURIComponent(source)}`;
    })();

    const res = await fetch(upstreamUrl, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ articles: [], error: `Upstream error: ${res.status}` }, { status: 502 });
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];

    interface ArticleData {
      url?: string;
      title?: string;
      source?: string;
      image?: string;
      timestamp?: string;
    }

    const articles = (data as ArticleData[]).map((a) => ({
      id: encodeURIComponent(a?.url || a?.title || ''),
      source: a?.source || source,
      author: '',
      title: a?.title || '',
      description: '',
      url: a?.url || '',
      image: upgradeImage(a?.image),
      publishedAt: a?.timestamp || '',
      content: '',
    }));

    // Deduplicate by URL (normalize URLs for comparison)
    const seenUrls = new Set<string>();
    const uniqueArticles = articles.filter((article: { url: string; title: string; source: string; publishedAt: string; image: string }) => {
      let normalizedUrl = article.url?.toLowerCase().trim() || '';
      if (!normalizedUrl) return false;
      
      // Normalize URL: remove query params, fragments, trailing slashes
      try {
        // Add protocol if missing (assume https)
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'https://' + normalizedUrl;
        }
        const urlObj = new URL(normalizedUrl);
        normalizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, '');
      } catch {
        // If URL parsing fails, use the original normalized URL but remove query params manually
        normalizedUrl = normalizedUrl.split('?')[0].split('#')[0].replace(/\/$/, '');
      }
      
      if (seenUrls.has(normalizedUrl)) {
        return false;
      }
      seenUrls.add(normalizedUrl);
      return true;
    });

    interface Article {
      id: string;
      source: string;
      author: string;
      title: string;
      description: string;
      url: string;
      image: string;
      publishedAt: string;
      content: string;
    }

    // Sort newest first
    uniqueArticles.sort((a: Article, b: Article) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      return timeB - timeA;
    });

    interface ResponseData {
      cached?: boolean;
    }

    return NextResponse.json({ 
      articles: uniqueArticles, 
      count: uniqueArticles.length, 
      cached: Boolean((json as ResponseData)?.cached ?? false) 
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ articles: [], error: errorMessage }, { status: 500 });
  }
}


