export default function HighlightsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Section Skeleton */}
      <section className="surface p-5 md:p-6 hero-glow relative overflow-hidden">
        <div className="space-y-4">
          <div>
            <div className="skeleton h-3 w-32 mb-2 rounded" />
            <div className="skeleton h-8 w-48 mb-2 rounded" />
            <div className="skeleton h-4 w-96 max-w-full rounded" />
          </div>
          
          {/* View Toggle Skeleton */}
          <div className="flex items-center gap-2">
            <div className="skeleton h-10 w-20 rounded-lg" />
            <div className="skeleton h-10 w-20 rounded-lg" />
          </div>
          
          {/* Search Bar Skeleton */}
          <div className="skeleton h-12 w-full rounded-lg" />
          
          {/* Filter Buttons Skeleton */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-32 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>

      {/* Results Count Skeleton */}
      <div className="skeleton h-5 w-32 rounded" />

      {/* Match Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="surface p-6 space-y-4">
            {/* League Badge Skeleton */}
            <div className="skeleton h-6 w-32 rounded-full" />
            
            {/* Teams Skeleton */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-right">
                  <div className="skeleton h-6 w-24 rounded ml-auto" />
                </div>
                <div className="skeleton h-4 w-8 rounded" />
                <div className="flex-1">
                  <div className="skeleton h-6 w-24 rounded" />
                </div>
              </div>
              <div className="skeleton h-8 w-16 rounded mx-auto" />
            </div>
            
            {/* Date & Time Skeleton */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
            
            {/* Button Skeleton */}
            <div className="pt-1">
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

