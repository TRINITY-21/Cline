export default function HighlightDetailLoading() {
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

      {/* Video Player Skeleton */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="w-full aspect-video skeleton" />
      </div>

      {/* Match Info Skeleton */}
      <div className="surface p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
          </div>
        </div>
      </div>

      {/* Comments Section Skeleton */}
      <div className="surface p-6 space-y-4">
        <div className="skeleton h-6 w-32 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

