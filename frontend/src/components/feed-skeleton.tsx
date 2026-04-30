export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-primary/20" aria-hidden>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex gap-3 py-4">
          <span className="pv-shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="pv-shimmer h-3 w-28 rounded" />
              <span className="pv-shimmer h-3 w-16 rounded" />
              <span className="pv-shimmer h-3 w-10 rounded" />
            </div>
            <span className="pv-shimmer block h-4 w-2/3 rounded" />
            <span className="pv-shimmer block h-3 w-full rounded" />
            <span className="pv-shimmer block h-3 w-5/6 rounded" />
            <div className="mt-2 flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="pv-shimmer h-6 w-10 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
