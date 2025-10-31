import { PageMetadata } from '@/lib/types';

function parseMetaTag(content: string, name: string): string | undefined {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const match = content.match(pattern);
  return match?.[1];
}

function parseTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}

export async function fetchPageMetadata(targetUrl: string): Promise<PageMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Try HEAD first to read headers quickly
    let xfo: string | null = null;
    let csp: string | null = null;
    try {
      const headResp = await fetch(targetUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; StreamHubBot/1.0)'
        }
      });
      xfo = headResp.headers.get('x-frame-options');
      csp = headResp.headers.get('content-security-policy');
    } catch {}

    // Fetch HTML to parse OG tags
    const resp = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; StreamHubBot/1.0)'
      }
    });
    const html = await resp.text();

    // Also capture headers from GET in case HEAD blocked
    if (!xfo) xfo = resp.headers.get('x-frame-options');
    if (!csp) csp = resp.headers.get('content-security-policy');

    const title = parseMetaTag(html, 'og:title') ?? parseTitle(html);
    const description = parseMetaTag(html, 'og:description') ?? parseMetaTag(html, 'description');
    const image = parseMetaTag(html, 'og:image');
    const siteName = parseMetaTag(html, 'og:site_name');

    const meta: PageMetadata = {
      url: targetUrl,
      canFrame: true,
      title,
      description,
      image,
      siteName
    };

    const xfoValue = xfo?.toLowerCase();
    if (xfoValue && (xfoValue.includes('deny') || xfoValue.includes('sameorigin'))) {
      meta.canFrame = false;
      meta.frameBlockedBy = 'x-frame-options';
    } else if (csp) {
      const lc = csp.toLowerCase();
      if (lc.includes('frame-ancestors')) {
        // If frame-ancestors is present and does not include * or our origin, conservatively block
        const directive = lc.split(';').map(s => s.trim()).find(s => s.startsWith('frame-ancestors'));
        if (directive && !/frame-ancestors\s+\*|frame-ancestors\s+'self'/.test(directive)) {
          meta.canFrame = false;
          meta.frameBlockedBy = 'csp';
        }
      }
    }

    return meta;
  } finally {
    clearTimeout(timeout);
  }
}


