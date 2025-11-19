"use client";

import GameBrowser from '@/components/GameBrowser';
import TodayMatches from '@/components/TodayMatches';

export default function HomePage() {
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      {/* Single Column Layout: Trending and Today's Matches */}
      <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 w-full max-w-full">
        {/* Trending Section */}
        <section className="surface p-2 sm:p-2.5 md:p-3 hero-glow w-full box-border overflow-x-hidden rounded-2xl border border-white/10">
          <div className="flex items-center gap-1.5 mb-0">
            <span className="text-sm sm:text-base">🔥</span>
            <h2 className="text-sm sm:text-base md:text-lg font-extrabold">
              <span className="text-[rgb(var(--brand-yellow))]">Trending</span> Now
            </h2>
          </div>
          <div className="mt-1.5">
            <GameBrowser />
          </div>
        </section>

        {/* Today's Matches Section */}
        <section className="surface p-3 sm:p-4 md:p-5 hero-glow w-full box-border overflow-x-hidden rounded-2xl border border-white/10">
          <div className="flex items-center gap-1.5 mb-0">
            <span className="text-base sm:text-lg">📅</span>
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold">
              Today&apos;s <span className="text-[rgb(var(--brand-yellow))]">Matches</span>
            </h2>
          </div>
          <div className="mt-2.5">
            <TodayMatches />
          </div>
        </section>
        </div>
    </div>
  );
}
