export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-bg-elevated-2 rounded-md" />
          <div className="h-4 w-72 bg-bg-elevated-2/60 rounded-md" />
        </div>
        <div className="h-9 w-36 bg-bg-elevated-2 rounded-md" />
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-bg-elevated border border-border-hairline space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-bg-elevated-2 rounded" />
              <div className="w-4 h-4 rounded bg-bg-elevated-2" />
            </div>
            <div className="h-8 w-12 bg-bg-elevated-2 rounded" />
            <div className="h-3 w-28 bg-bg-elevated-2/50 rounded" />
          </div>
        ))}
      </div>

      {/* Main Section Skeleton */}
      <div className="p-6 rounded-lg bg-bg-elevated border border-border-hairline space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-bg-elevated-2 rounded" />
          <div className="h-4 w-20 bg-bg-elevated-2/60 rounded" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 w-full rounded-md bg-bg-elevated-2/40 border border-border-hairline"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
