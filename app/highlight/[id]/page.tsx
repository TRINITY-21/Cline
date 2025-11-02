import AdSense from '@/components/AdSense';
import { findTeamByName } from '@/lib/catalog';
import { getDarkModeFilter } from '@/lib/logos';
import { readFileSync } from 'fs';
import { Metadata } from 'next';
import Link from 'next/link';
import path from 'path';
import { type HighlightMatch } from '../data';
// import { CommentsSection } from './CommentsSection'; // Hidden for now

function getAllMatches(): HighlightMatch[] {
  const filePath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (fileError) {
    // Fallback to basic file
    const fallbackPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
    try {
      const fileContent = readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch {
      return [];
    }
  }
}

function getMatch(id: string): HighlightMatch | null {
  const matches = getAllMatches();
  return matches.find(m => 
    m.id === id || 
    m.id === decodeURIComponent(id) ||
    m.id?.includes(id) ||
    m.url?.includes(id) ||
    (m.homeTeam && m.awayTeam && 
     `${m.homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${m.awayTeam.toLowerCase().replace(/\s+/g, '-')}`.includes(id.toLowerCase()))
  ) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const match = getMatch(id);
  
  if (!match) {
    return {
      title: 'Match Not Found',
    };
  }
  
  return {
    title: `${match.homeTeam} vs ${match.awayTeam} - Highlights`,
    description: `Watch extended highlights of ${match.homeTeam} vs ${match.awayTeam}${match.league ? ` (${match.league})` : ''}. ${match.score ? `Final score: ${match.score}` : ''}`,
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = getMatch(id);
  
  if (!match) {
    return (
      <div className="space-y-4">
        <Link href="/highlight" className="text-sm text-white/60 hover:text-white underline inline-flex items-center gap-2">
          ← Back to Highlights
        </Link>
        <div className="surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Match Not Found</h1>
          <p className="text-white/60">The match you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <MatchDetailClient match={match} />
  );
}

function MatchDetailClient({ match }: { match: HighlightMatch }) {
  // Helper function to detect if a logo is a crest-style (with text/details) vs simple-style (clean like Tottenham)
  const isCrestStyleLogo = (teamName: string, logoUrl: string | null): boolean => {
    if (!logoUrl) return false;
    const nameLower = teamName.toLowerCase();
    
    // Teams with simple/clean logos (NOT crest-style) - exclude these even if from Wikipedia
    const simpleLogoTeams = ['tottenham', 'spurs', 'tottenham hotspur', 'leicester', 'southampton'];
    if (simpleLogoTeams.some(team => nameLower.includes(team))) return false;
    
    // Known teams with crest-style logos (complex with text)
    const crestTeams = ['everton', 'dortmund', 'borussia dortmund', 'manchester united', 'manchester city', 
                        'liverpool', 'chelsea', 'arsenal', 'west ham', 'crystal palace', 'wolves', 
                        'burnley', 'brighton', 'fulham', 'brentford', 'norwich', 'watford', 
                        'newcastle', 'aston villa', 'sheffield', 'leeds'];
    if (crestTeams.some(team => nameLower.includes(team))) return true;
    
    // Check if logo URL suggests it's a crest (Wikipedia commons often have crests)
    // But only if not already identified as a simple logo team
    if (logoUrl.includes('wikipedia') || logoUrl.includes('crest') || logoUrl.includes('badge')) {
      return true;
    }
    return false;
  };

  // Get team logos - prefer logos from scraped data, fallback to catalog
  // Filter out invalid base64 placeholders (1x1 transparent PNG)
  const isValidLogoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    // Skip base64 data URIs that are placeholders (very short base64 strings)
    if (url.startsWith('data:image') && url.length < 200) return false;
    // Skip placeholder URLs
    if (url.includes('doubleclick') || url.includes('googleads')) return false;
    return true;
  };

  const scrapedHomeLogo = match.logos?.homeTeam && isValidLogoUrl(match.logos.homeTeam) ? match.logos.homeTeam : null;
  const scrapedAwayLogo = match.logos?.awayTeam && isValidLogoUrl(match.logos.awayTeam) ? match.logos.awayTeam : null;
  const homeTeam = findTeamByName(match.homeTeam, 'Football');
  const awayTeam = findTeamByName(match.awayTeam, 'Football');
  const homeLogo = scrapedHomeLogo || homeTeam?.logo || null;
  const awayLogo = scrapedAwayLogo || awayTeam?.logo || null;
  const isHomeCrest = isCrestStyleLogo(match.homeTeam, homeLogo);
  const isAwayCrest = isCrestStyleLogo(match.awayTeam, awayLogo);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Team Crests Background - Outside hero section, on main page background */}
      <>
        {/* Left Side - Home Team Crest */}
        {homeLogo && (
          <div className={`fixed left-0 top-[15%] -translate-x-[45%] w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] transition-all duration-700 pointer-events-none z-0 ${
            isHomeCrest 
              ? 'opacity-[0.10] hover:opacity-[0.30]' 
              : 'opacity-[0.05] hover:opacity-[0.25]'
          }`}>
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={homeLogo}
                alt={`${match.homeTeam} crest`}
                className="w-auto h-auto object-contain"
                style={{
                  width: isHomeCrest ? '75%' : '70%',
                  height: 'auto',
                  maxWidth: '100%',
                  ...getDarkModeFilter(isHomeCrest),
                }}
              />
            </div>
          </div>
        )}
        
        {/* Right Side - Away Team Crest */}
        {awayLogo && (
          <div className={`fixed right-0 top-[15%] translate-x-[45%] w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px] transition-all duration-700 pointer-events-none z-0 ${
            isAwayCrest 
              ? 'opacity-[0.10] hover:opacity-[0.30]' 
              : 'opacity-[0.05] hover:opacity-[0.25]'
          }`}>
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={awayLogo}
                alt={`${match.awayTeam} crest`}
                className="w-auto h-auto object-contain"
                style={{
                  width: isAwayCrest ? '75%' : '70%',
                  height: 'auto',
                  maxWidth: '100%',
                  ...getDarkModeFilter(isAwayCrest),
                }}
              />
            </div>
          </div>
        )}
      </>

      {/* Back Button */}
      <Link 
        href="/highlight" 
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-all duration-300 hover:gap-3 group relative z-10"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
        <span>Back to Highlights</span>
      </Link>

      {/* Hero Section */}
      <section className="surface p-6 md:p-8 hero-glow relative overflow-hidden group">
        {/* Animated background gradient overlay */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="space-y-4">
              {(match.league || match.category) && (
                <div className="mb-3 animate-in slide-in-from-left duration-500">
                  <span className="pill pill-active text-sm">
                    {match.league || match.category}
                  </span>
                </div>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 animate-in slide-in-from-left duration-700 delay-100">
                <span className="text-white transition-all inline-block hover:scale-105">{match.homeTeam}</span>
              <span className="text-white/40 mx-4 font-light">vs</span>
              <span className="text-white transition-all inline-block hover:scale-105">{match.awayTeam}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm mt-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group/item">
                  <span className="group-hover/item:scale-110 transition-transform">📅</span>
                  <span>{match.date}</span>
                </div>
                {match.time && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group/item">
                    <span className="group-hover/item:scale-110 transition-transform">⏰</span>
                    <span>{match.time}</span>
                  </div>
                )}
                {match.stage && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all group/item">
                    <span className="group-hover/item:scale-110 transition-transform">🏆</span>
                    <span>{match.stage}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Score Display */}
            {match.score && (
              <div className="text-center md:text-right animate-in slide-in-from-right duration-700 delay-200">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Final Score</div>
                <div className="text-5xl md:text-6xl lg:text-7xl font-black text-[rgb(var(--brand-yellow))] mb-2 hover:scale-105 transition-transform duration-300 whitespace-nowrap">
                  {match.score.replace(/\s+/g, ' ').trim()}
                </div>
                {match.halftimeScore && (
                  <div className="text-sm text-white/60 font-medium">
                    HT: <span className="text-white/80">{match.halftimeScore}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Player or Placeholder */}
          <div className="mt-6 animate-in fade-in duration-700 delay-300">
            <div className="relative group/video">
              {/* Outer container with subtle border */}
              <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-black via-black to-gray-900 relative">
                {/* Subtle inner glow effect */}
                <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-[rgb(var(--brand-yellow))]/5 via-transparent to-blue-500/5 opacity-50" />
                <div className="absolute inset-[2px] rounded-xl bg-black" />
                
                {match.videoSrc ? (
                  /* Video player - supports both MP4 and iframe */
                  <div className="absolute inset-[2px] rounded-lg overflow-hidden">
                    {match.videoSrc.includes('.mp4') || match.videoSrc.includes('streamable.com/video') ? (
                     <iframe title="Real Madrid vs Valencia Player" marginHeight={0} marginWidth={0} src="https://embedsports.top/embed/admin/ppv-real-madrid-vs-valencia-cf/1" scrolling="no" allowFullScreen allow="encrypted-media; picture-in-picture;" width="100%" height="100%" frameBorder="0"></iframe>
                    ) : (
                      <iframe
                        title={`${match.homeTeam} vs ${match.awayTeam} Highlights`}
                        src={"https://main.uxsyplayerbcd362c475.click/index.php?id=stivibuspor-3#watermark=https%3A%2F%2Fwww.sporcafe-782a1a67028f.xyz%2Fassets%2Fuploads%2F43543534.png&reklamResim=https%3A%2F%2Fwww.sporcafe-782a1a67028f.xyz%2Fassets%2Fuploads%2Fbtkmbtypmn.gif&reklamGidis=https%3A%2F%2Fcutt.ly%2F1rIwpRBL"}
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowFullScreen
                        referrerPolicy="no-referrer"
                        className="w-full h-full border-0"
                        style={{ 
                          width: '100%', 
                          height: '100%',
                          backgroundColor: '#000'
                        }}
                      />
                    )}
                  </div>
                ) : (
                  /* No Video Placeholder */
                  <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
                    <div className="text-center space-y-4">
                      <div className="text-6xl md:text-7xl mb-4 opacity-50">🎬</div>
                      <div className="text-xl md:text-2xl font-bold text-white/80 mb-2">
                        Video Not Available
                      </div>
                      <div className="text-sm md:text-base text-white/60 max-w-md">
                        Highlights for this match are currently unavailable. Please check back later or visit the source website.
                      </div>
                      {match.url && (
                        <a
                          href={match.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[rgb(var(--brand-yellow))] text-black font-semibold rounded-lg hover:bg-[rgb(var(--brand-yellow))]/90 transition-colors"
                        >
                          <span>Visit Source</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                    
                    {/* Decorative grid pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '50px 50px'
                    }} />
                  </div>
                )}
                
                {/* Hover overlay gradient - only show when video exists */}
                {match.videoSrc && (
                  <>
                    <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-[rgb(var(--brand-yellow))]/10 via-transparent to-blue-500/10 opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />
                    
                    {/* Corner accents */}
                    <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-[rgb(var(--brand-yellow))]/20 rounded-tl-xl opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-30" />
                    <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-[rgb(var(--brand-yellow))]/20 rounded-tr-xl opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-30" />
                    <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-[rgb(var(--brand-yellow))]/20 rounded-bl-xl opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-30" />
                    <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-[rgb(var(--brand-yellow))]/20 rounded-br-xl opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-30" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Match Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teams Section */}
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-lg font-bold mb-4 text-[rgb(var(--brand-yellow))] flex items-center gap-2">
            <span className="w-1 h-6 bg-[rgb(var(--brand-yellow))] rounded-full"></span>
            Teams
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/item">
              <div>
                <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Home Team</div>
                <div className="text-xl font-bold text-white group-hover/item:text-[rgb(var(--brand-yellow))] transition-colors">{match.homeTeam}</div>
              </div>
              <div className="text-4xl opacity-20 group-hover/item:opacity-40 group-hover/item:scale-110 transition-all duration-300">🏠</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/item">
              <div>
                <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Away Team</div>
                <div className="text-xl font-bold text-white group-hover/item:text-blue-400 transition-colors">{match.awayTeam}</div>
              </div>
              <div className="text-4xl opacity-20 group-hover/item:opacity-40 group-hover/item:scale-110 transition-all duration-300">✈️</div>
            </div>
          </div>
        </section>

        {/* Match Details */}
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-lg font-bold mb-4 text-[rgb(var(--brand-yellow))] flex items-center gap-2">
            <span className="w-1 h-6 bg-[rgb(var(--brand-yellow))] rounded-full"></span>
            Match Details
          </h2>
          <div className="space-y-4">
            {match.venue && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/item">
                <div className="text-2xl group-hover/item:scale-125 transition-transform duration-300">📍</div>
                <div className="flex-1">
                  <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Venue</div>
                  <div className="text-white font-medium group-hover/item:text-[rgb(var(--brand-yellow))] transition-colors">{match.venue}</div>
                </div>
              </div>
            )}
            
            {match.referee && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/item">
                <div className="text-2xl group-hover/item:scale-125 transition-transform duration-300">👤</div>
                <div className="flex-1">
                  <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Referee</div>
                  <div className="text-white font-medium group-hover/item:text-[rgb(var(--brand-yellow))] transition-colors">{match.referee}</div>
                </div>
              </div>
            )}

            {match.league && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-white/20 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/item">
                <div className="text-2xl group-hover/item:scale-125 transition-transform duration-300">🏆</div>
                <div className="flex-1">
                  <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">League</div>
                  <div className="text-white font-medium group-hover/item:text-[rgb(var(--brand-yellow))] transition-colors">{match.league}</div>
                </div>
              </div>
            )}

            {!match.venue && !match.referee && !match.league && (
              <div className="text-center text-white/50 py-8">
                Additional match details not available
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Score Breakdown */}
      {match.score && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-lg font-bold mb-5 text-[rgb(var(--brand-yellow))] flex items-center gap-2">
            <span className="w-1 h-6 bg-[rgb(var(--brand-yellow))] rounded-full"></span>
            Score Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-gradient-to-br from-[rgb(var(--brand-yellow))]/10 to-[rgb(var(--brand-yellow))]/5 rounded-xl border border-[rgb(var(--brand-yellow))]/20 hover:border-[rgb(var(--brand-yellow))]/40 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-xs text-white/60 mb-3 uppercase tracking-wider font-semibold">Final</div>
              <div className="text-4xl font-black text-[rgb(var(--brand-yellow))] group-hover/item:scale-110 transition-transform">{match.score}</div>
            </div>
            {match.halftimeScore && (
              <div className="p-5 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-300 text-center group/item">
                <div className="text-xs text-white/60 mb-3 uppercase tracking-wider font-semibold">Halftime</div>
                <div className="text-3xl font-black text-white group-hover/item:scale-110 transition-transform">{match.halftimeScore}</div>
              </div>
            )}
            <div className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20 hover:border-green-500/40 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-xs text-white/60 mb-3 uppercase tracking-wider font-semibold">Status</div>
              <div className="text-2xl font-black text-green-400 group-hover/item:scale-110 transition-transform flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Completed
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lineups */}
      {match.lineups && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
            Lineups
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team Lineup */}
            {match.lineups.home && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">{match.homeTeam}</h3>
                  {match.lineups.home.formation && (
                    <span className="pill pill-muted text-xs font-semibold">
                      {match.lineups.home.formation}
                    </span>
                  )}
                </div>
                
                {/* Starting XI */}
                <div>
                  <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Starting XI</h4>
                  <div className="space-y-2">
                    {match.lineups.home.players.map((player, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/player"
                      >
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 rounded-lg font-bold text-sm text-white shrink-0 border border-white/20 group-hover/player:scale-110 group-hover/player:border-[rgb(var(--brand-yellow))]/50 transition-all duration-300">
                          {player.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate group-hover/player:text-[rgb(var(--brand-yellow))] transition-colors">{player.name}</span>
                            {player.captain && (
                              <span className="text-xs bg-[rgb(var(--brand-yellow))]/20 text-[rgb(var(--brand-yellow))] px-2 py-0.5 rounded-full font-bold border border-[rgb(var(--brand-yellow))]/30">C</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-white/50 uppercase font-semibold">{player.position}</span>
                            {player.yellowCard && (
                              <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/50 font-bold">{player.yellowCard}'</span>
                            )}
                            {player.redCard && (
                              <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/50 font-bold">{player.redCard}'</span>
                            )}
                          </div>
                        </div>
                        {player.rating !== null && player.rating !== undefined && (
                          <div className={`text-sm font-bold px-2 py-1 rounded-lg border ${
                            player.rating >= 8 ? 'text-green-300 bg-green-500/20 border-green-500/30' :
                            player.rating >= 7 ? 'text-blue-300 bg-blue-500/20 border-blue-500/30' :
                            player.rating >= 6 ? 'text-yellow-300 bg-yellow-500/20 border-yellow-500/30' :
                            'text-red-300 bg-red-500/20 border-red-500/30'
                          } group-hover/player:scale-110 transition-transform duration-300`}>
                            {player.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Substitutes */}
                {match.lineups.home.substitutes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Substitutes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {match.lineups.home.substitutes.map((sub, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10 text-sm"
                        >
                          <span className="text-white/50 font-semibold">{sub.number}</span>
                          <span className="text-white/70 truncate flex-1">{sub.name}</span>
                          {sub.rating && (
                            <span className="text-xs text-white/40">{sub.rating.toFixed(1)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach */}
                {match.lineups.home.coach && (
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-white/50 mb-1">Coach</div>
                    <div className="text-white font-medium">{match.lineups.home.coach}</div>
                  </div>
                )}
              </div>
            )}

            {/* Away Team Lineup */}
            {match.lineups.away && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">{match.awayTeam}</h3>
                  {match.lineups.away.formation && (
                    <span className="pill pill-muted text-xs font-semibold">
                      {match.lineups.away.formation}
                    </span>
                  )}
                </div>
                
                {/* Starting XI */}
                <div>
                  <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Starting XI</h4>
                  <div className="space-y-2">
                    {match.lineups.away.players.map((player, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/5 to-white/0 rounded-lg border border-white/10 hover:border-blue-500/30 hover:from-white/10 hover:to-white/5 transition-all duration-300 group/player"
                      >
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 rounded-lg font-bold text-sm text-white shrink-0 border border-white/20 group-hover/player:scale-110 group-hover/player:border-blue-500/50 transition-all duration-300">
                          {player.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium truncate group-hover/player:text-blue-400 transition-colors">{player.name}</span>
                            {player.captain && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">C</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-white/50 uppercase font-semibold">{player.position}</span>
                            {player.yellowCard && (
                              <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/50 font-bold">{player.yellowCard}'</span>
                            )}
                            {player.redCard && (
                              <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/50 font-bold">{player.redCard}'</span>
                            )}
                          </div>
                        </div>
                        {player.rating !== null && player.rating !== undefined && (
                          <div className={`text-sm font-bold px-2 py-1 rounded-lg border ${
                            player.rating >= 8 ? 'text-green-300 bg-green-500/20 border-green-500/30' :
                            player.rating >= 7 ? 'text-blue-300 bg-blue-500/20 border-blue-500/30' :
                            player.rating >= 6 ? 'text-yellow-300 bg-yellow-500/20 border-yellow-500/30' :
                            'text-red-300 bg-red-500/20 border-red-500/30'
                          } group-hover/player:scale-110 transition-transform duration-300`}>
                            {player.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Substitutes */}
                {match.lineups.away.substitutes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Substitutes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {match.lineups.away.substitutes.map((sub, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10 text-sm"
                        >
                          <span className="text-white/50 font-semibold">{sub.number}</span>
                          <span className="text-white/70 truncate flex-1">{sub.name}</span>
                          {sub.rating && (
                            <span className="text-xs text-white/40">{sub.rating.toFixed(1)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coach */}
                {match.lineups.away.coach && (
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-white/50 mb-1">Coach</div>
                    <div className="text-white font-medium">{match.lineups.away.coach}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Match Statistics */}
      {match.stats && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
            Match Statistics
          </h2>
          
          {/* Possession */}
          {match.stats.possession && (
            <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Ball Possession</span>
                <span className="text-xs text-white/60 font-medium">
                  {match.stats.possession.home}% - {match.stats.possession.away}%
                </span>
              </div>
              <div className="relative h-10 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-full overflow-hidden shadow-inner border border-white/10">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/80 flex items-center justify-end pr-3 transition-all duration-500"
                  style={{ width: `${match.stats.possession.home}%` }}
                >
                  <span className="text-xs font-black text-black">{match.stats.possession.home}%</span>
                </div>
                <div
                  className="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-500/80 to-blue-500 flex items-center justify-start pl-3 transition-all duration-500"
                  style={{ width: `${match.stats.possession.away}%` }}
                >
                  <span className="text-xs font-black text-white">{match.stats.possession.away}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Expected Goals */}
          {match.stats.expectedGoals && (
            <div className="mb-8 p-6 bg-gradient-to-br from-white/5 via-white/5 to-white/0 rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
              <div className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Expected Goals (xG)</div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1 group">
                  <div className="text-3xl font-black text-[rgb(var(--brand-yellow))] group-hover:scale-110 transition-transform duration-300">{match.stats.expectedGoals.home}</div>
                  <div className="text-xs text-white/60 mt-2 font-medium">{match.homeTeam}</div>
                </div>
                <div className="text-white/30 text-xl font-light">vs</div>
                <div className="text-center flex-1 group">
                  <div className="text-3xl font-black text-blue-400 group-hover:scale-110 transition-transform duration-300">{match.stats.expectedGoals.away}</div>
                  <div className="text-xs text-white/60 mt-2 font-medium">{match.awayTeam}</div>
                </div>
              </div>
            </div>
          )}

          {/* Attack Stats */}
          {match.stats.attack && (
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-5 text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-white/40 rounded-full"></span>
                Attack
              </h3>
              <div className="space-y-4">
                {Object.values(match.stats.attack).map((stat, idx) => {
                  const total = parseFloat(stat.home) + parseFloat(stat.away);
                  const homePercent = total > 0 ? (parseFloat(stat.home) / total) * 100 : 50;
                  const awayPercent = total > 0 ? (parseFloat(stat.away) / total) * 100 : 50;
                  return (
                    <div key={idx} className="space-y-2 group">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70 font-medium uppercase tracking-wider">{stat.label}</span>
                      </div>
                      <div className="relative h-7 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-full overflow-hidden shadow-inner border border-white/10">
                        <div className="absolute inset-0 flex">
                          <div
                            className="bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/80 flex items-center justify-end pr-3 transition-all duration-300"
                            style={{ width: `${homePercent}%` }}
                          >
                            <span className="text-xs font-black text-black">{stat.home}</span>
                          </div>
                          <div
                            className="bg-gradient-to-l from-blue-500/80 to-blue-500 flex items-center justify-start pl-3 transition-all duration-300 ml-auto"
                            style={{ width: `${awayPercent}%` }}
                          >
                            <span className="text-xs font-black text-white">{stat.away}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Passing Stats */}
          {match.stats.passing && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4 text-white">Passing</h3>
              <div className="space-y-3">
                {Object.values(match.stats.passing).map((stat, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 p-3 bg-white/5 rounded border border-white/10">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{stat.home}</div>
                      <div className="text-xs text-white/50">{match.homeTeam}</div>
                    </div>
                    <div className="text-center text-xs text-white/50 uppercase">{stat.label}</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">{stat.away}</div>
                      <div className="text-xs text-white/50">{match.awayTeam}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discipline Stats */}
          {match.stats.discipline && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">Discipline</h3>
              <div className="space-y-3">
                {Object.values(match.stats.discipline).map((stat, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 p-3 bg-white/5 rounded border border-white/10">
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">{stat.home}</div>
                      <div className="text-xs text-white/50">{match.homeTeam}</div>
                    </div>
                    <div className="text-center text-xs text-white/50 uppercase">{stat.label}</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">{stat.away}</div>
                      <div className="text-xs text-white/50">{match.awayTeam}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Team Form & Recent Matches */}
      {match.teamForm && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
            Current League Standings & Form
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Home Team Form */}
            {match.teamForm.home && (
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{match.homeTeam}</h3>
                  <div className="px-3 py-1 bg-[rgb(var(--brand-yellow))]/20 text-[rgb(var(--brand-yellow))] rounded-lg font-bold text-sm border border-[rgb(var(--brand-yellow))]/30">
                    {match.teamForm.home.position}th
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Points</div>
                    <div className="text-2xl font-black text-[rgb(var(--brand-yellow))]">{match.teamForm.home.points}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Record</div>
                    <div className="text-sm font-bold text-white">{match.teamForm.home.won}W {match.teamForm.home.drawn}D {match.teamForm.home.lost}L</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Goals</div>
                    <div className="text-sm font-bold text-white">{match.teamForm.home.goalsFor}-{match.teamForm.home.goalsAgainst}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Form</div>
                    <div className="flex gap-1">
                      {match.teamForm.home.form.map((result, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                            result === 'W' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                            result === 'D' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                            'bg-red-500/30 text-red-300 border border-red-500/50'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Home Record */}
                {match.teamForm.home.homeRecord && (
                  <div className="p-4 bg-gradient-to-r from-[rgb(var(--brand-yellow))]/10 to-[rgb(var(--brand-yellow))]/5 rounded-lg border border-[rgb(var(--brand-yellow))]/20 mb-4">
                    <div className="text-xs text-[rgb(var(--brand-yellow))] uppercase tracking-wider font-bold mb-2">🏠 Home Record</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-white/70">Record: </span>
                        <span className="text-white font-bold">{match.teamForm.home.homeRecord.won}W {match.teamForm.home.homeRecord.drawn}D {match.teamForm.home.homeRecord.lost}L</span>
                      </div>
                      <div>
                        <span className="text-white/70">Goals: </span>
                        <span className="text-white font-bold">{match.teamForm.home.homeRecord.goalsFor} - {match.teamForm.home.homeRecord.goalsAgainst}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Matches */}
                {match.teamForm.home.recentMatches && match.teamForm.home.recentMatches.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 uppercase tracking-wider font-bold mb-3">Recent Matches</div>
                    <div className="space-y-2">
                      {match.teamForm.home.recentMatches.map((recent, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">{recent.homeTeam} vs {recent.awayTeam}</div>
                              <div className="text-xs text-white/50 mt-1">{recent.competition} • {recent.date}</div>
                            </div>
                            <div className="ml-3 px-2 py-1 bg-white/10 rounded font-bold text-white text-xs border border-white/20">
                              {recent.score}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Away Team Form */}
            {match.teamForm.away && (
              <div className="p-6 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{match.awayTeam}</h3>
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-bold text-sm border border-blue-500/30">
                    {match.teamForm.away.position}th
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Points</div>
                    <div className="text-2xl font-black text-blue-400">{match.teamForm.away.points}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Record</div>
                    <div className="text-sm font-bold text-white">{match.teamForm.away.won}W {match.teamForm.away.drawn}D {match.teamForm.away.lost}L</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Goals</div>
                    <div className="text-sm font-bold text-white">{match.teamForm.away.goalsFor}-{match.teamForm.away.goalsAgainst}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Form</div>
                    <div className="flex gap-1">
                      {match.teamForm.away.form.map((result, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                            result === 'W' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                            result === 'D' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                            'bg-red-500/30 text-red-300 border border-red-500/50'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Away Record */}
                {match.teamForm.away.awayRecord && (
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 mb-4">
                    <div className="text-xs text-blue-300 uppercase tracking-wider font-bold mb-2">✈️ Away Record</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-white/70">Record: </span>
                        <span className="text-white font-bold">{match.teamForm.away.awayRecord.won}W {match.teamForm.away.awayRecord.drawn}D {match.teamForm.away.awayRecord.lost}L</span>
                      </div>
                      <div>
                        <span className="text-white/70">Goals: </span>
                        <span className="text-white font-bold">{match.teamForm.away.awayRecord.goalsFor} - {match.teamForm.away.awayRecord.goalsAgainst}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Matches */}
                {match.teamForm.away.recentMatches && match.teamForm.away.recentMatches.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 uppercase tracking-wider font-bold mb-3">Recent Matches</div>
                    <div className="space-y-2">
                      {match.teamForm.away.recentMatches.map((recent, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">{recent.homeTeam} vs {recent.awayTeam}</div>
                              <div className="text-xs text-white/50 mt-1">{recent.competition} • {recent.date}</div>
                            </div>
                            <div className="ml-3 px-2 py-1 bg-white/10 rounded font-bold text-white text-xs border border-white/20">
                              {recent.score}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Head to Head */}
      {match.headToHead && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
            Head to Head
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-5 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-white/30 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-4xl font-black text-white mb-2 group-hover/item:text-[rgb(var(--brand-yellow))] transition-colors">{match.headToHead.homeWins || 0}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">{match.homeTeam} Wins</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-4xl font-black text-[rgb(var(--brand-yellow))] mb-2 group-hover/item:scale-110 transition-transform">{match.headToHead.draws || 0}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">Draws</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-blue-500/30 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-4xl font-black text-white mb-2 group-hover/item:text-blue-400 transition-colors">{match.headToHead.awayWins || 0}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">{match.awayTeam} Wins</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-white/5 to-white/0 rounded-xl border border-white/10 hover:border-blue-500/30 hover:scale-105 transition-all duration-300 text-center group/item">
              <div className="text-4xl font-black text-blue-400 mb-2 group-hover/item:scale-110 transition-transform">{match.headToHead.lastMeetings || 0}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">Last Meetings</div>
            </div>
          </div>
          {match.headToHead.description && (
            <div className="p-6 bg-gradient-to-br from-white/5 via-white/5 to-white/0 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
              <p className="text-sm text-white/70 leading-relaxed">{match.headToHead.description}</p>
            </div>
          )}
        </section>
      )}

      {/* League Standings Table */}
      {match.standings && match.standings.length > 0 && (
        <section className="surface p-6 group hover:border-[rgb(var(--brand-yellow))]/30 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--brand-yellow))] flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-[rgb(var(--brand-yellow))] to-[rgb(var(--brand-yellow))]/50 rounded-full"></span>
            {match.league} Standings
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Pos</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Team</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden md:table-cell">MP</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden lg:table-cell">W</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden lg:table-cell">D</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden lg:table-cell">L</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden md:table-cell">+/-</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider">GD</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Pts</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-white/70 uppercase tracking-wider hidden lg:table-cell">Form</th>
                </tr>
              </thead>
              <tbody>
                {match.standings.map((team, idx) => {
                  const isHomeTeam = team.team === match.homeTeam;
                  const isAwayTeam = team.team === match.awayTeam;
                  const zoneBg = 
                    team.qualificationZone === 'champions-league' ? 'bg-blue-500/10 border-blue-500/30' :
                    team.qualificationZone === 'europa-league' ? 'bg-purple-500/10 border-purple-500/30' :
                    team.qualificationZone === 'relegation' ? 'bg-red-500/10 border-red-500/30' :
                    '';
                  
                  return (
                    <tr
                      key={idx}
                      className={`
                        border-b border-white/5 hover:bg-white/5
                        ${isHomeTeam || isAwayTeam ? 'bg-[rgb(var(--brand-yellow))]/10 border-[rgb(var(--brand-yellow))]/20' : ''}
                        ${zoneBg}
                        ${isHomeTeam || isAwayTeam ? 'font-bold' : ''}
                      `}
                    >
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                          team.position <= 4 ? 'bg-blue-500/20 text-blue-300' :
                          team.position <= 6 ? 'bg-purple-500/20 text-purple-300' :
                          team.position >= 18 ? 'bg-red-500/20 text-red-300' :
                          'bg-white/5 text-white/70'
                        }`}>
                          {team.position}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                            {team.team.charAt(0)}
                          </div>
                          <span className={`${isHomeTeam || isAwayTeam ? 'text-[rgb(var(--brand-yellow))]' : 'text-white'} font-medium`}>
                            {team.team}
                            {isHomeTeam && <span className="ml-2 text-xs text-white/50">(Home)</span>}
                            {isAwayTeam && <span className="ml-2 text-xs text-white/50">(Away)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-white/80 font-medium hidden md:table-cell">{team.played}</td>
                      <td className="py-3 px-4 text-center text-white/80 font-medium hidden lg:table-cell">{team.won}</td>
                      <td className="py-3 px-4 text-center text-white/80 font-medium hidden lg:table-cell">{team.drawn}</td>
                      <td className="py-3 px-4 text-center text-white/80 font-medium hidden lg:table-cell">{team.lost}</td>
                      <td className="py-3 px-4 text-center text-white/80 font-medium hidden md:table-cell">{team.goalsFor}-{team.goalsAgainst}</td>
                      <td className={`py-3 px-4 text-center font-bold ${
                        team.goalDifference > 0 ? 'text-green-400' :
                        team.goalDifference < 0 ? 'text-red-400' :
                        'text-white/70'
                      }`}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg bg-[rgb(var(--brand-yellow))]/20 text-[rgb(var(--brand-yellow))] font-bold text-sm border border-[rgb(var(--brand-yellow))]/30">
                          {team.points}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {team.form?.slice(0, 5).map((result, i) => (
                            <span
                              key={i}
                              className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                                result === 'W' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                result === 'D' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' :
                                'bg-red-500/30 text-red-300 border border-red-500/50'
                              }`}
                              title={`Match ${i + 1}: ${result}`}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Qualification Zones Legend */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30"></div>
                <span className="text-white/70">Champions League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30"></div>
                <span className="text-white/70">Europa League</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30"></div>
                <span className="text-white/70">Relegation Zone</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comments Section - Hidden for now */}
      {/* <CommentsSection matchId={match.id} initialComments={match.comments || []} /> */}

      {/* AdSense Ad Unit - Only shown on pages with rich content */}
      <section className="surface p-6 border-t border-white/10">
        <AdSense 
          adSlot="3630582848" 
          className="flex justify-center"
        />
      </section>

      {/* Additional Actions */}
      <section className="surface p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold mb-2">Want more?</h3>
            <p className="text-sm text-white/60">
              {match.url ? (
                <a 
                  href={`/highlight`} 
                  rel="noopener noreferrer"
                  className="text-[rgb(var(--brand-yellow))] hover:underline"
                >
                  Browse the highlights →
                </a>
              ) : (
                'Explore more highlights from other matches'
              )}
            </p>
          </div>
          <Link href="/highlight" className="btn btn-primary">
            Browse All Highlights
          </Link>
        </div>
      </section>
    </div>
  );
}

