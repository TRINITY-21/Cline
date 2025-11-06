import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPSTREAM_BASE = 'https://cline-news.netlify.app/api/v2/news';
const ONEFOOTBALL_BASE = `${UPSTREAM_BASE}/OneFootball`;
const FOURFOURTWO_BASE = `${UPSTREAM_BASE}/FourFourtwo/bundesliga`;

function upgradeImage(url: string | undefined | null): string {
  const u = String(url || '').trim();
  if (!u) return '';
  // Common tiny thumbnails from minutemediacdn include w_16; bump to a sensible width
  if (/minutemediacdn\.com/.test(u)) {
    return u.replace(/w_16(?!\d)/g, 'w_1200');
  }
  // Generic pattern: w=16 in query
  if (/[?&]w=16(?!\d)/.test(u)) {
    return u.replace(/([?&]w=)16(?!\d)/, '$1800');
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
      const sources = Array.isArray(json) ? json.map((s: any) => String(s?.title || '').trim()).filter(Boolean) : [];
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

    const articles = data.map((a: any) => ({
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

    // Sort newest first
    articles.sort((a: { publishedAt: string }, b: { publishedAt: string }) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({ articles, count: articles.length, cached: Boolean(json?.cached ?? false) });
  } catch (err: any) {
    return NextResponse.json({ articles: [], error: err?.message || 'Unknown error' }, { status: 500 });
  }
}


