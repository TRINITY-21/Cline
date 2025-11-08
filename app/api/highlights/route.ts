import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.scorebat.com/video-api/v3', {
      // Server-side fetch, no CORS needed
      cache: 'no-store',
      // Some providers block default UA; keep it simple
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ matches: [], error: `Upstream error: ${res.status}` }, { status: 502 });
    }

    const json = await res.json() as { response?: unknown[] };
    interface ScoreBatItem {
      title?: string;
      competition?: string;
      date?: string;
      matchviewUrl?: string;
      videos?: Array<{ embed?: string }>;
    }
    const items: ScoreBatItem[] = Array.isArray(json?.response) ? json.response as ScoreBatItem[] : [];

    interface HighlightMatch {
      id: string;
      title: string;
      homeTeam: string;
      awayTeam: string;
      league: string;
      date: string;
      videoSrc?: string;
      category: string;
      url?: string;
    }

    const matches: HighlightMatch[] = items.map((item) => {
      const title: string = item?.title || '';
      const competition: string = item?.competition || '';
      const dateIso: string = item?.date || '';
      const matchviewUrl: string | undefined = item?.matchviewUrl;
      const firstVideo = Array.isArray(item?.videos) && item.videos.length > 0 ? item.videos[0] : null;

      // Parse teams from title formatted as "Home - Away"
      let homeTeam = '';
      let awayTeam = '';
      if (typeof title === 'string' && title.includes(' - ')) {
        const [home, away] = title.split(' - ');
        homeTeam = home?.trim();
        awayTeam = away?.trim();
      }

      // Extract iframe src from provided embed HTML, fallback to matchviewUrl
      let videoSrc: string | undefined = undefined;
      if (firstVideo?.embed && typeof firstVideo.embed === 'string') {
        const m = firstVideo.embed.match(/src='([^']+)'/);
        videoSrc = m ? m[1] : undefined;
      }
      if (!videoSrc && typeof matchviewUrl === 'string') {
        videoSrc = matchviewUrl;
      }

      return {
        id: `${homeTeam || title}-${awayTeam}`.toLowerCase().replace(/\s+/g, '-'),
        title,
        homeTeam: homeTeam || title,
        awayTeam: awayTeam || '',
        league: competition,
        date: dateIso ? new Date(dateIso).toLocaleString() : '',
        videoSrc,
        category: competition,
        url: matchviewUrl,
      };
    });

    // Newest first
    matches.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });

    return NextResponse.json({ matches });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching highlights:', error);
    return NextResponse.json({ matches: [], error: errorMessage }, { status: 500 });
  }
}
