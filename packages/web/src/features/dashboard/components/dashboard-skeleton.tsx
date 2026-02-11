import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-72 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
            <Skeleton className="mt-2 h-5 w-28 rounded-full" />
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Sales chart skeleton */}
        <div className="lg:col-span-2 lg:row-span-2 rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>

        {/* Financial skeleton */}
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          ))}
        </div>

        {/* Customer insights skeleton */}
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>

        {/* Payment chart skeleton */}
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[180px] w-[180px] rounded-full mx-auto" />
        </div>

        {/* Top products skeleton */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
