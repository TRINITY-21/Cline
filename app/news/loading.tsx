export default function NewsLoading() {
  return (
    <div className="space-y-6">
      {/* Header - keep identical to page header while content loads */}
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow relative overflow-hidden group min-h-[160px] md:min-h-[200px]">
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Football &amp; Sports</div>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">
              Latest <span className="text-[rgb(var(--brand-yellow))]">News</span>
            </h2>
            <p className="text-white/70 mt-2 max-w-prose">Curated from trusted outlets via our sources list.</p>
          </div>

          {/* Source tabs row (empty during loading to avoid layout shift) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar min-w-0 min-h-[40px] sm:min-h-[44px]" />
          </div>
        </div>
      </section>

      {/* News Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="surface overflow-hidden rounded-xl border border-white/10">
            <div className="relative aspect-video skeleton rounded-t-xl" />
            <div className="p-4 space-y-2">
              <div className="skeleton h-5 w-24 rounded-full" />
              <div className="skeleton h-6 w-full rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

