export default function NewsDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back Link Skeleton */}
      <div className="skeleton h-5 w-32 rounded" />

      {/* Header Section Skeleton */}
      <section className="surface p-5 md:p-6 hero-glow relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-6 w-24 rounded-full" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded" />
        </div>
      </section>

      {/* Image Skeleton */}
      <div className="rounded-xl overflow-hidden border border-white/10">
        <div className="w-full aspect-video skeleton" />
      </div>

      {/* Article Content Skeleton */}
      <article className="surface p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-full rounded" />
            {i % 3 === 0 && <div className="skeleton h-4 w-5/6 rounded" />}
          </div>
        ))}
      </article>
    </div>
  );
}

