export default function PredictionsLoading() {
  return (
    <div className="space-y-10">
      {/* Header Section Skeleton */}
      <section className="surface p-5 md:p-6 hero-glow relative">
        <div className="space-y-4">
          <div>
            <div className="skeleton h-3 w-32 mb-2 rounded" />
            <div className="skeleton h-8 w-48 mb-2 rounded" />
            <div className="skeleton h-4 w-96 max-w-full rounded" />
          </div>
          
          {/* Filter Buttons Skeleton */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-28 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </section>

      {/* Predictions Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="surface p-4 space-y-3">
            {/* League Badge */}
            <div className="skeleton h-5 w-24 rounded-full" />
            
            {/* Teams */}
            <div className="space-y-2">
              <div className="skeleton h-5 w-full rounded" />
              <div className="skeleton h-4 w-16 rounded mx-auto" />
              <div className="skeleton h-5 w-full rounded" />
            </div>
            
            {/* Prediction Info */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
            
            {/* Action Button */}
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

