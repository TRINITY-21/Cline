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

    const json = await res.json();
    const items: any[] = Array.isArray(json?.response) ? json.response : [];

    const matches = items.map((item) => {
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
    matches.sort((a: any, b: any) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });

    return NextResponse.json({ matches });
  } catch (error: any) {
    return NextResponse.json({ matches: [], error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
