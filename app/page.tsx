"use client";

import AdSense from '@/components/AdSense';
import GameBrowser from '@/components/GameBrowser';
import ScoreBatLivescore from '@/components/ScoreBatLivescore';
import TodayMatches from '@/components/TodayMatches';
import { useState } from 'react';

type TabView = 'trending' | 'today' | 'scores';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabView>('trending');

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden box-border">
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow w-full max-w-full box-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 w-full max-w-full">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-[10px] uppercase tracking-[0.2em] text-white/60">Multi‑Sport</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1">
              <span className="text-[rgb(var(--brand-yellow))]">Live</span> & Schedules
            </h2>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-prose">Browse football, hockey, volleyball and more. Click any game to instantly open the embedded player.</p>
          </div>
          {/* Segmented Control - Below text on mobile/tablet, to the right on desktop */}
          <div className="flex items-center mt-2 sm:mt-0 md:mt-0 md:ml-auto md:flex-shrink-0 w-full md:w-auto min-w-0">
            <div className="w-full md:w-auto inline-flex items-center bg-[#2C2C2E] border border-[#48484A] rounded-lg p-0.5 overflow-hidden box-border">
              <button
                onClick={() => setActiveTab('trending')}
                className={
                  "flex-1 md:flex-none px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 " +
                  (activeTab === 'trending'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black rounded-md shadow-sm'
                    : 'text-[#AEAEB2] hover:text-white')
                }
              >
                <span className="text-base sm:text-lg flex-shrink-0">🔥</span>
                <span className="whitespace-nowrap truncate">Trending</span>
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={
                  "flex-1 md:flex-none px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 " +
                  (activeTab === 'today'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black rounded-md shadow-sm'
                    : 'text-[#AEAEB2] hover:text-white')
                }
              >
                <span className="text-base sm:text-lg flex-shrink-0">📅</span>
                <span className="whitespace-nowrap truncate">
                  <span className="hidden sm:inline">Today&apos;s </span>Matches
                </span>
              </button>
              <button
                onClick={() => setActiveTab('scores')}
                className={
                  "flex-1 md:flex-none px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 " +
                  (activeTab === 'scores'
                    ? 'bg-[rgb(var(--brand-yellow))] text-black rounded-md shadow-sm'
                    : 'text-[#AEAEB2] hover:text-white')
                }
              >
                <span className="text-base sm:text-lg flex-shrink-0">⚽</span>
                <span className="whitespace-nowrap truncate">Scores</span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          {activeTab === 'trending' && <GameBrowser />}
          {activeTab === 'today' && <TodayMatches />}
          {activeTab === 'scores' && <ScoreBatLivescore />}
        </div>
      </section>

      {/* Informational Content Section (show only on Trending tab) */}
      {activeTab === 'trending' && (
      <section className="surface p-4 sm:p-5 md:p-8 hero-glow">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-3 sm:mb-4">
              <span className="text-[rgb(var(--brand-yellow))]">Three Two Live</span> - Your Ultimate Sports Streaming Destination
            </h2>
            <p className="text-white/70 leading-relaxed">
              Sports fans worldwide are always looking for reliable ways to watch their favorite games online. 
              Three Two Live has become one of the most popular free sports streaming platforms, attracting millions of viewers. 
              Whether you love football, hockey, basketball, baseball, or even niche sports, Three Two Live offers streams 
              that bring fans closer to the action.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">What is Three Two Live?</h3>
            <p className="text-white/70 mb-4">
              Three Two Live is a free sports streaming platform that provides live broadcasts of popular sporting events across the globe.
            </p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-[rgb(var(--brand-yellow))]">•</span>
                <span>Wide range of sports coverage including football, basketball, hockey, volleyball, and more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[rgb(var(--brand-yellow))]">•</span>
                <span>Free access without creating an account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[rgb(var(--brand-yellow))]">•</span>
                <span>Works seamlessly on both desktop and mobile devices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[rgb(var(--brand-yellow))]">•</span>
                <span>Real-time coverage of live games without expensive subscriptions</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">How Three Two Live Works</h3>
            <div className="space-y-4 text-white/70">
              <p>
                <strong className="text-white">Cross-Platform Access:</strong> You can access Three Two Live via any modern browser 
                on PC, tablet, or smartphone for a seamless viewing experience.
              </p>
              <p>
                <strong className="text-white">Streaming Quality:</strong> Stream quality varies from SD to HD, depending on available 
                links and your internet connection speed. We strive to provide the best possible viewing experience.
              </p>
              <p>
                <strong className="text-white">Supported Sports:</strong> Our platform covers a diverse range of sports including:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm sm:text-base">
                {['Football (Soccer & American)', 'Basketball', 'Baseball', 'Ice Hockey', 'Tennis', 'Volleyball', 'Motorsports', 'Cricket', 'Rugby'].map((sport) => (
                  <li key={sport} className="flex items-start gap-2">
                    <span className="text-[rgb(var(--brand-yellow))] flex-shrink-0 mt-0.5">•</span>
                    <span>{sport}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">Advantages of Using Three Two Live</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-white/70">
              {[
                'Free access to sports events worldwide',
                'User-friendly, intuitive design',
                'Diverse coverage with multiple categories',
                'Cross-device compatibility',
                'No registration required',
                'Multiple stream options per match'
              ].map((advantage) => (
                <li key={advantage} className="flex items-start gap-2">
                  <span className="text-[rgb(var(--brand-yellow))]">✓</span>
                  <span>{advantage}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">Top Leagues Covered</h3>
            <div className="space-y-4">
              {[
                { league: 'NFL (National Football League)', season: 'September to February, ending with the Super Bowl' },
                { league: 'NBA (National Basketball Association)', season: 'Regular season: October to April. Playoffs: April to June' },
                { league: 'MLB (Major League Baseball)', season: 'March/April to October, with the World Series in October' },
                { league: 'NHL (National Hockey League)', season: 'October to June, ending with the Stanley Cup Final' },
                { league: 'MLS (Major League Soccer)', season: 'February/March to December' }
              ].map((item) => (
                <div key={item.league} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <h4 className="font-semibold text-white mb-1">{item.league}</h4>
                  <p className="text-white/60 text-sm">{item.season}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">How to Use Three Two Live Safely</h3>
            <div className="space-y-3 text-white/70">
              <p>
                <strong className="text-white">Browser Security:</strong> Use modern, secure browsers and keep them updated. 
                Close unwanted pop-ups quickly and avoid clicking suspicious links.
              </p>
              <p>
                <strong className="text-white">VPN and Ad-Blockers:</strong> A VPN can help protect your privacy while streaming, 
                while ad-blockers can reduce distractions and improve your viewing experience.
              </p>
              <p>
                <strong className="text-white">Secure Connection:</strong> Always ensure you&apos;re using a secure internet connection. 
                Avoid public Wi-Fi for sensitive browsing.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3 text-[rgb(var(--brand-yellow))]">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {[
                {
                  q: 'Is Three Two Live free to use?',
                  a: 'Yes, Three Two Live is completely free. No registration or subscription required.'
                },
                {
                  q: 'Does Three Two Live work on mobile devices?',
                  a: 'Yes, our platform is fully optimized for mobile devices and works seamlessly on smartphones and tablets.'
                },
                {
                  q: 'What sports can I watch on Three Two Live?',
                  a: 'We cover a wide variety including football, basketball, hockey, baseball, tennis, volleyball, motorsports, cricket, rugby, and more.'
                },
                {
                  q: 'Why might streams not be available sometimes?',
                  a: 'Stream availability depends on various factors including match schedules, server status, and regional access. We continuously work to improve reliability.'
                },
                {
                  q: 'Do I need to create an account?',
                  a: 'No, you can start watching immediately without any registration.'
                },
                {
                  q: 'How does Three Two Live compare with paid streaming services?',
                  a: 'Three Two Live offers free access to sports streams, while paid services provide more reliability and guaranteed quality. Choose based on your needs and preferences.'
                }
              ].map((faq, i) => (
                <div key={i} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <h4 className="font-semibold text-white mb-2">{faq.q}</h4>
                  <p className="text-white/70 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-white/70 leading-relaxed">
              Three Two Live is a popular platform for fans seeking free sports streams. With our wide coverage and 
              user-friendly interface, we aim to bring sports fans closer to the action. By taking simple precautions 
              like using secure browsers and VPNs when appropriate, you can enjoy sports safely and conveniently.
            </p>
          </div>

          {/* AdSense Ad Unit - Only shown on pages with substantial content */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <AdSense 
              adSlot="5438488539" 
              className="flex justify-center"
            />
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
