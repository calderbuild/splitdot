export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="skeleton h-4 w-24 rounded-lg" />
      <div className="skeleton h-8 w-32 rounded-lg" />
      <div className="flex gap-2">
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-7 w-7 rounded-full" />
        <div className="skeleton h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4"
        >
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="skeleton h-5 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
