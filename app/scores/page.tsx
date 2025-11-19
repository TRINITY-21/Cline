"use client";

import ScoreBatLivescore from '@/components/ScoreBatLivescore';

export default function ScoresPage() {
  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden box-border">
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow w-full max-w-full box-border overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 w-full max-w-full">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-[10px] uppercase tracking-[0.2em] text-white/60">Live Scores</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-1">
              <span className="text-[rgb(var(--brand-yellow))]">Match</span> Scores
            </h2>
            <p className="text-white/70 mt-2 text-sm sm:text-base max-w-prose">Real-time scores and match updates from leagues around the world.</p>
          </div>
        </div>
        <div className="mt-6">
          <ScoreBatLivescore />
        </div>
      </section>
    </div>
  );
}

