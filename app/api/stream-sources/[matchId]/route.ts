import { NextRequest, NextResponse } from 'next/server';

const STREAMED_API_BASE = 'https://streamed.pk/api';

/**
 * Fetch stream URL for a specific source with retry logic
 */
async function fetchStreamUrl(source: string, id: string, retries: number = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        // Wait a bit before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }

      const response = await fetch(`${STREAMED_API_BASE}/stream/${source}/${id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        // Don't cache on retries, allow fresh fetches
        next: { revalidate: attempt === 0 ? 60 : 0 },
      });

      if (!response.ok) {
        if (attempt < retries) {
          continue;
        }
        return null;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        if (attempt < retries) {
          continue;
        }
        return null;
      }

      // Prefer HD streams, then first available
      interface StreamData {
        hd?: boolean;
        embedUrl?: string;
      }
      const streamData = data as StreamData[];
      const hdStream = streamData.find((s) => s.hd);
      const stream = hdStream || streamData[0];
      const embedUrl = stream?.embedUrl || null;
      
      return embedUrl;
    } catch (error) {
      if (attempt < retries) {
        continue;
      }
      return null;
    }
  }
  
  return null;
}

/**
 * GET /api/stream-sources/[matchId]
 * Fetch all available stream URLs for a match
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    // First, get the match details to get sources
    // Try all-today endpoint first (more reliable for live matches)
    const todayResponse = await fetch(`${STREAMED_API_BASE}/matches/all-today`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 60 },
    });
    
    interface StreamSource {
      source: string;
      id: string;
    }

    interface Match {
      id?: string;
      sources?: StreamSource[];
    }

    let match: Match | undefined;
    let matchSources: StreamSource[] = [];

    if (todayResponse.ok) {
      const todayMatches = (await todayResponse.json()) as Match[];
      
      // Try exact match first
      match = todayMatches.find((m) => m.id === matchId);
      
      // If no exact match, try partial match (in case matchId format differs)
      if (!match) {
        match = todayMatches.find((m) => 
          m.id?.includes(matchId) || (m.id && matchId.includes(m.id))
        );
      }
      
      if (match) {
        matchSources = match.sources || [];
      } else {
        // Try direct match endpoint as fallback
        const matchResponse = await fetch(`${STREAMED_API_BASE}/matches/${matchId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          next: { revalidate: 60 },
        });
        
        if (matchResponse.ok) {
          match = (await matchResponse.json()) as Match;
          matchSources = match.sources || [];
        } else {
          return NextResponse.json({ 
            error: 'Match not found',
            matchId,
            triedEndpoints: ['/matches/all-today', `/matches/${matchId}`]
          }, { status: 404 });
        }
      }
    } else {
      return NextResponse.json({ 
        error: 'Failed to fetch matches',
        status: todayResponse.status
      }, { status: 500 });
    }
    
    if (matchSources.length === 0) {
      return NextResponse.json({ error: 'No sources found' }, { status: 404 });
    }

    // Fetch all stream URLs in parallel with retry logic
    // Return ALL sources, even if URL fetch fails - client can retry them
    interface StreamResult {
      source: string;
      url: string | null;
      id: string;
      needsRetry?: boolean;
    }

    const streamPromises = matchSources.map(async (src): Promise<StreamResult | null> => {
      if (!src.source || !src.id) {
        return null;
      }
      
      const url = await fetchStreamUrl(src.source, src.id);
      
      if (url) {
        return { 
          source: src.source, 
          url,
          id: src.id, // Keep the ID for potential retries
        };
      } else {
        // Return source info even if URL fetch failed
        // Client can retry fetching the URL when switching sources
        return { 
          source: src.source, 
          id: src.id,
          url: null, // Null URL indicates needs retry
          needsRetry: true,
        };
      }
    });

    const allStreams = await Promise.all(streamPromises);
    // Filter out only completely invalid sources (null), but keep ALL valid sources (even without URLs)
    const streams = allStreams.filter((s): s is StreamResult => s !== null);
    
    // Separate streams with URLs and without URLs
    const streamsWithUrls = streams.filter(s => s.url);
    const streamsWithoutUrls = streams.filter(s => !s.url);
    
    // Return ALL sources - client will handle retrying ones without URLs
    // Prioritize sources with URLs first, then ones without URLs
    const sortedStreams = [...streamsWithUrls, ...streamsWithoutUrls];
    
    return NextResponse.json({ 
      streams: sortedStreams,
      summary: {
        total: streams.length,
        withUrls: streamsWithUrls.length,
        needsRetry: streamsWithoutUrls.length,
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching stream sources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
