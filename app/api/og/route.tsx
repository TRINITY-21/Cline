import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const homeTeam = searchParams.get('home') || 'Team 1';
    const awayTeam = searchParams.get('away') || 'Team 2';
    const league = searchParams.get('league') || '';
    const time = searchParams.get('time') || '';
    const isLive = searchParams.get('live') === 'true';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
            position: 'relative',
          }}
        >
          {/* Live indicator */}
          {isLive && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                right: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: '20px',
                background: 'rgba(255, 212, 0, 0.15)',
                border: '1px solid rgba(255, 212, 0, 0.3)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFD400',
                }}
              />
              <span style={{ color: '#FFD400', fontSize: 14, fontWeight: 700 }}>LIVE</span>
            </div>
          )}

          {/* League */}
          {league && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                left: 40,
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {league}
            </div>
          )}

          {/* Teams */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 60,
              marginBottom: 20,
            }}
          >
            {/* Home Team */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                maxWidth: 300,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {homeTeam}
              </div>
            </div>

            {/* VS */}
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              VS
            </div>

            {/* Away Team */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                maxWidth: 300,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {awayTeam}
              </div>
            </div>
          </div>

          {/* Time or Status */}
          {(time || isLive) && (
            <div
              style={{
                marginTop: 20,
                fontSize: 20,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {isLive ? 'Watch Live Now' : `Starts ${time}`}
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: '#FFD400',
              }}
            >
              Three Two Live
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG image generation error:', e);
    return new Response(`Failed to generate the image: ${e.message}`, { status: 500 });
  }
}

