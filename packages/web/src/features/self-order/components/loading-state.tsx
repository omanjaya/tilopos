import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for self-order page
 * Displays placeholder content while data is loading
 */
export function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header skeleton */}
        <Skeleton className="h-24 w-full" />

        {/* Search skeleton */}
        <Skeleton className="h-12 w-full" />

        {/* Categories skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20" />
          ))}
        </div>

        {/* Menu grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
