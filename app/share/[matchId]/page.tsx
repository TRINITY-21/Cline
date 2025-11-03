import DefaultTeamLogo from '@/components/DefaultTeamLogo';
import { firstNameOf, getDisplayName } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';

// This would ideally fetch from your API or database
// For now, we'll parse from the matchId or use query params
export async function generateMetadata({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const queryParams = await searchParams;
  
  // Extract match data from query params
  const homeTeam = (queryParams.home as string) || 'Team 1';
  const awayTeam = (queryParams.away as string) || 'Team 2';
  const league = (queryParams.league as string) || '';
  const time = (queryParams.time as string) || '';
  const isLive = queryParams.live === 'true';
  
  const title = isLive 
    ? `🔴 LIVE: ${homeTeam} vs ${awayTeam} | Three Two Live`
    : `${homeTeam} vs ${awayTeam}${league ? ` • ${league}` : ''} | Three Two Live`;
  
  const description = isLive
    ? `Watch ${homeTeam} vs ${awayTeam} live${league ? ` in ${league}` : ''}. Live streaming on Three Two Live!`
    : `${homeTeam} vs ${awayTeam}${league ? ` • ${league}` : ''}${time ? ` • Starts ${time}` : ''}. Watch live on Three Two Live!`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Three Two Live',
      images: [
        {
          url: '/three-two-logo.svg', // Could be enhanced with dynamic OG image generation
          width: 1200,
          height: 630,
          alt: `${homeTeam} vs ${awayTeam}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ShareMatchPage({ params, searchParams }: { 
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { matchId } = await params;
  const queryParams = await searchParams;
  
  // Extract match data from query params or matchId
  const homeTeam = (queryParams.home as string) || 'Team 1';
  const awayTeam = (queryParams.away as string) || 'Team 2';
  const league = (queryParams.league as string) || '';
  const time = (queryParams.time as string) || '';
  const isLive = queryParams.live === 'true';
  const sport = (queryParams.sport as string) || 'Football';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Share Card - Matching TodayMatches style */}
        <div className="surface p-6 hero-glow border-[rgb(var(--brand-yellow))]/30">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            {league && (
              <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                {league}
              </span>
            )}
            <div className="flex items-center gap-2">
              {time && !isLive && (
                <span className="text-[10px] font-medium text-white/60 font-mono">
                  {time}
                </span>
              )}
              {isLive && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgb(var(--brand-yellow))]/15 border border-[rgb(var(--brand-yellow))]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--brand-yellow))] animate-pulse" />
                  <span className="text-[9px] font-bold text-[rgb(var(--brand-yellow))] uppercase tracking-wide">
                    LIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center gap-4 mb-6">
            {/* Home Team */}
            <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 p-2 flex items-center justify-center">
                <DefaultTeamLogo name={firstNameOf(homeTeam)} size={56} />
              </div>
              <p className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">
                {getDisplayName(homeTeam, 20)}
              </p>
            </div>

            {/* VS */}
            <div className="flex-shrink-0">
              <span className="text-xs font-medium text-white/40">VS</span>
            </div>

            {/* Away Team */}
            <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 p-2 flex items-center justify-center">
                <DefaultTeamLogo name={firstNameOf(awayTeam)} size={56} />
              </div>
              <p className="text-sm font-semibold text-white text-center leading-tight line-clamp-2">
                {getDisplayName(awayTeam, 20)}
              </p>
            </div>
          </div>

          {/* Action Section */}
          <div className="pt-4 border-t border-white/10">
            {isLive ? (
              <Link
                href="/"
                className="w-full rounded-lg bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] text-black font-bold text-sm px-4 py-3 transition-all duration-200 hover:from-[#FFE066] hover:to-[rgb(var(--brand-yellow))] hover:shadow-lg hover:shadow-[rgb(var(--brand-yellow))]/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                <span>Watch Live on Three Two Live</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white/70 font-medium text-sm px-4 py-3 text-center hover:bg-white/10 transition-colors"
              >
                {time ? `Starts ${time}` : 'Scheduled Match'}
              </Link>
            )}
          </div>

          {/* Branding */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/three-two-logo.svg" alt="Three Two Live" className="w-6 h-6" />
              <span className="text-xs font-bold text-[rgb(var(--brand-yellow))]">Three Two Live</span>
            </div>
            <p className="text-[10px] text-white/50">Your ultimate sports streaming destination</p>
          </div>
        </div>

        {/* Redirect notice */}
        <div className="mt-4 text-center text-white/60 text-xs">
          <p>Click the button above to watch the match live</p>
        </div>
      </div>
    </div>
  );
}

