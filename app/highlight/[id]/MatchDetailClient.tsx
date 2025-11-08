"use client";

import AdSense from '@/components/AdSense';
import { findTeamByName, normalizeName } from '@/lib/catalog';
import Link from 'next/link';
import React from 'react';
import { type HighlightMatch } from '../data';

export default function MatchDetailClient({ match }: { match: HighlightMatch }) {
  const [streamHomeLogo, setStreamHomeLogo] = React.useState<string | null>(null);
  const [streamAwayLogo, setStreamAwayLogo] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadStreamedLogos() {
      try {
        const res = await fetch('/api/matches-streamed', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const homeN = normalizeName(match.homeTeam || '');
        const awayN = normalizeName(match.awayTeam || '');
        const exact = data.find((g: any) => {
          const h = normalizeName(g?.home?.name || '');
          const a = normalizeName(g?.away?.name || '');
          return (h === homeN && a === awayN) || (h === awayN && a === homeN);
        });
        const candidate = exact || data.find((g: any) => {
          const h = normalizeName(g?.home?.name || '');
          const a = normalizeName(g?.away?.name || '');
          return h === homeN || a === awayN || h === awayN || a === homeN;
        });
        if (!candidate) return;
        const hLogo = candidate?.home?.logo || null;
        const aLogo = candidate?.away?.logo || null;
        if (!cancelled) {
          setStreamHomeLogo(typeof hLogo === 'string' ? hLogo : null);
          setStreamAwayLogo(typeof aLogo === 'string' ? aLogo : null);
        }
      } catch {}
    }
    loadStreamedLogos();
    return () => { cancelled = true; };
  }, [match.homeTeam, match.awayTeam]);

  const isCrestStyleLogo = (teamName: string, logoUrl: string | null): boolean => {
    if (!logoUrl) return false;
    const nameLower = teamName.toLowerCase();
    const simpleLogoTeams = ['tottenham', 'spurs', 'tottenham hotspur', 'leicester', 'southampton'];
    if (simpleLogoTeams.some(team => nameLower.includes(team))) return false;
    const crestTeams = ['everton', 'dortmund', 'borussia dortmund', 'manchester united', 'manchester city', 
                        'liverpool', 'chelsea', 'arsenal', 'west ham', 'crystal palace', 'wolves', 
                        'burnley', 'brighton', 'fulham', 'brentford', 'norwich', 'watford', 
                        'newcastle', 'aston villa', 'sheffield', 'leeds'];
    if (crestTeams.some(team => nameLower.includes(team))) return true;
    if (logoUrl.includes('wikipedia') || logoUrl.includes('crest') || logoUrl.includes('badge')) {
      return true;
    }
    return false;
  };

  const isValidLogoUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.startsWith('data:image') && url.length < 200) return false;
    if (url.includes('doubleclick') || url.includes('googleads')) return false;
    return true;
  };

  const scrapedHomeLogo = match.logos?.homeTeam && isValidLogoUrl(match.logos.homeTeam) ? match.logos.homeTeam : null;
  const scrapedAwayLogo = match.logos?.awayTeam && isValidLogoUrl(match.logos.awayTeam) ? match.logos.awayTeam : null;
  const homeTeam = findTeamByName(match.homeTeam, 'Football');
  const awayTeam = findTeamByName(match.awayTeam, 'Football');
  const homeLogo = streamHomeLogo || scrapedHomeLogo || homeTeam?.logo || null;
  const awayLogo = streamAwayLogo || scrapedAwayLogo || awayTeam?.logo || null;
  const isHomeCrest = isCrestStyleLogo(match.homeTeam, homeLogo);
  const isAwayCrest = isCrestStyleLogo(match.awayTeam, awayLogo);

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10">

    {/* <div className="space-y-6 animate-in fade-in duration-500 relative w-full"> */}
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
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="space-y-4 w-full flex flex-col items-center md:items-start">
              {(match.league || match.category) && (
                <div className="mb-3 animate-in slide-in-from-left duration-500">
                  <span className="pill pill-active text-sm">{match.league || match.category}</span>
                </div>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 animate-in slide-in-from-left duration-700 delay-100 w-full">
                <div className="flex items-center justify-center gap-3 md:gap-4 w-full md:w-auto">
                  <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                    {homeLogo ? (
                      <img src={homeLogo} alt="" className="object-contain" style={{ width: '80%', height: '80%' }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src="https://streamed.pk/api/images/badge/GwZg7AZpYEZgHCAjAJgCzuFgpsCwVgBDQhWYNMATkhQFZgrDh49g773htbKbcAxozAp0kbsSwJ0IWShAx65BgObAwPeOKoTCDVmA1tcEIA.webp" 
                        alt="" 
                        className="object-contain opacity-80" 
                        style={{ width: '80%', height: '80%' }} 
                      />
                    )}
                    <div className="absolute inset-0 rounded-full ring-1 ring-white/10" />
                  </div>
                  <span className="text-white transition-all inline-block hover:scale-105">{match.homeTeam}</span>
                  <span className="text-white/40 mx-1 md:mx-3 font-light">vs</span>
                  <span className="text-white transition-all inline-block hover:scale-105">{match.awayTeam}</span>
                  <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                    {awayLogo ? (
                      <img src={awayLogo} alt="" className="object-contain" style={{ width: '80%', height: '80%' }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src="https://streamed.pk/api/images/badge/GwZg7AZpYEZgHCAjAJgCzuFgpsCwVgBDQhWYNMATkhQFZgrDh49g773htbKbcAxozAp0kbsSwJ0IWShAx65BgObAwPeOKoTCDVmA1tcEIA.webp" 
                        alt="" 
                        className="object-contain opacity-80" 
                        style={{ width: '80%', height: '80%' }} 
                      />
                    )}
                    <div className="absolute inset-0 rounded-full ring-1 ring-white/10" />
                  </div>
                </div>
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

          {/* Video Player / Placeholder (unchanged aside from being inside client) */}
          <div className="mt-6 animate-in fade-in duration-700 delay-300">
            <div className="relative group/video md:sticky md:top-4 md:z-10">
              <div className="aspect-video md:aspect-[16/10] md:min-h-[410px] lg:aspect-[16/9] lg:min-h-[510px] xl:aspect-[16/8] xl:min-h-[610px] 2xl:min-h-[710px] rounded-xl overflow-hidden bg-gradient-to-br from-black via-black to-gray-900 relative w-full">
                <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-[rgb(var(--brand-yellow))]/5 via-transparent to-blue-500/5 opacity-50" />
                <div className="absolute inset-[2px] rounded-xl bg-black" />
                {match.videoSrc ? (
                  <div className="absolute inset-[2px] rounded-lg overflow-hidden">
                    {match.videoSrc.includes('.mp4') || match.videoSrc.includes('streamable.com/video') ? (
                      <iframe title="Highlights Player" marginHeight={0} marginWidth={0} src={match.videoSrc} scrolling="no" allowFullScreen allow="encrypted-media; picture-in-picture;" width="100%" height="100%" frameBorder="0"></iframe>
                    ) : (
                      <iframe title={`${match.homeTeam} vs ${match.awayTeam} Highlights`} src={match.videoSrc} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" className="w-full h-full border-0" style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
                    <div className="text-center space-y-4">
                      <div className="text-6xl md:text-7xl mb-4 opacity-50">🎬</div>
                      <div className="text-xl md:text-2xl font-bold text-white/80 mb-2">Video Not Available</div>
                      <div className="text-sm md:text-base text-white/60 max-w-md">Highlights for this match are currently unavailable. Please check back later or visit the source website.</div>
                      {match.url && (
                        <a href={match.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[rgb(var(--brand-yellow))] text-black font-semibold rounded-lg hover:bg-[rgb(var(--brand-yellow))]/90 transition-colors">
                          <span>Visit Source</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '50px 50px'
                    }} />
                  </div>
                )}
                {match.videoSrc && (
                  <>
                    <div className="absolute inset-[2px] rounded-lg bg-gradient-to-br from-[rgb(var(--brand-yellow))]/10 via-transparent to-blue-500/10 opacity-0 group-hover/video:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />
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
      <section className="surface p-6 border-t border-white/10">
        <AdSense adSlot="3630582848" className="flex justify-center" />
      </section>
    </div>
  );
}


