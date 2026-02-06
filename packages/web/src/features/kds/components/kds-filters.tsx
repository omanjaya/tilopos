import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FILTER_TABS, type FilterTab } from '../hooks/useKdsFilters';

interface KdsFiltersProps {
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  filterCounts: Record<FilterTab, number>;
}

export function KdsFilters({ activeFilter, onFilterChange, filterCounts }: KdsFiltersProps) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-950/30 px-4 py-2">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-500" />
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeFilter === tab.value
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  activeFilter === tab.value
                    ? 'bg-orange-800 text-orange-200'
                    : 'bg-zinc-700 text-zinc-400',
                )}
              >
                {filterCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
