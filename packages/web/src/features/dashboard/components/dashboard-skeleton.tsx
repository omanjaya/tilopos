import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Tabs + Date picker */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-80 rounded-lg" />
        <Skeleton className="h-10 w-52 rounded-lg" />
      </div>

      {/* KPI Grid 2x3 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>
      </div>

      {/* Item summary */}
      <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-10 w-full mb-4 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
