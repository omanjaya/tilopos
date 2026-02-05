import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MobileBottomSheet } from './mobile-bottom-sheet';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MobileFilters Component
 *
 * Generic filter component for mobile with:
 * - Bottom sheet UI
 * - Multiple filter types (select, checkbox, multi-select)
 * - Active filter chips
 * - Apply/Reset actions
 * - Persistent state
 *
 * Usage:
 * ```tsx
 * <MobileFilters
 *   filters={[
 *     {
 *       id: 'category',
 *       label: 'Kategori',
 *       type: 'select',
 *       options: [{ value: 'all', label: 'Semua' }, ...],
 *     },
 *     {
 *       id: 'inStock',
 *       label: 'Stok Tersedia',
 *       type: 'checkbox',
 *     },
 *   ]}
 *   values={{ category: 'food', inStock: true }}
 *   onChange={(values) => setFilters(values)}
 * />
 * ```
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'checkbox' | 'multi-select';
  options?: FilterOption[]; // For select and multi-select
  placeholder?: string; // For select
}

export interface MobileFiltersProps {
  /** Filter configurations */
  filters: FilterConfig[];
  /** Current filter values */
  values: Record<string, string | boolean | string[]>;
  /** Callback when filters change */
  onChange: (values: Record<string, string | boolean | string[]>) => void;
  /** Optional onApply callback (if not provided, onChange is called immediately) */
  onApply?: () => void;
  /** Optional onReset callback */
  onReset?: () => void;
  /** Trigger button className */
  triggerClassName?: string;
  /** Trigger button text (default: "Filter") */
  triggerText?: string;
  /** Show active count badge (default: true) */
  showBadge?: boolean;
}

export function MobileFilters({
  filters,
  values,
  onChange,
  onApply,
  onReset,
  triggerClassName,
  triggerText = 'Filter',
  showBadge = true,
}: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const [tempValues, setTempValues] = useState(values);

  // Count active filters (excluding default/empty values)
  const activeCount = Object.entries(values).filter(([_key, value]) => {
    if (typeof value === 'boolean') return value === true;
    if (Array.isArray(value)) return value.length > 0;
    // For select, check if it's not the default "all" or empty
    return value !== '' && value !== 'all';
  }).length;

  // Handle opening sheet
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTempValues(values); // Reset temp values to current when opening
    }
    setOpen(isOpen);
  };

  // Handle filter value change
  const handleFilterChange = (filterId: string, value: string | boolean | string[]) => {
    const newValues = { ...tempValues, [filterId]: value };
    setTempValues(newValues);

    // If no onApply callback, update immediately
    if (!onApply) {
      onChange(newValues);
    }
  };

  // Handle apply
  const handleApply = () => {
    onChange(tempValues);
    if (onApply) {
      onApply();
    }
    setOpen(false);
  };

  // Handle reset
  const handleReset = () => {
    const resetValues: Record<string, string | boolean | string[]> = {};
    filters.forEach((filter) => {
      if (filter.type === 'checkbox') {
        resetValues[filter.id] = false;
      } else if (filter.type === 'multi-select') {
        resetValues[filter.id] = [];
      } else {
        resetValues[filter.id] = 'all';
      }
    });
    setTempValues(resetValues);
    onChange(resetValues);
    if (onReset) {
      onReset();
    }
  };

  // Get active filter chips
  const activeFilters = Object.entries(values)
    .map(([filterId, value]) => {
      const filter = filters.find((f) => f.id === filterId);
      if (!filter) return null;

      let label = '';
      if (filter.type === 'checkbox' && value === true) {
        label = filter.label;
      } else if (filter.type === 'select' && value !== '' && value !== 'all') {
        const option = filter.options?.find((o) => o.value === value);
        label = option?.label || String(value);
      } else if (filter.type === 'multi-select' && Array.isArray(value) && value.length > 0) {
        label = `${filter.label} (${value.length})`;
      }

      return label ? { id: filterId, label } : null;
    })
    .filter(Boolean) as { id: string; label: string }[];

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        className={cn('gap-2', triggerClassName)}
        onClick={() => setOpen(true)}
        aria-label="Filter data"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>{triggerText}</span>
        {showBadge && activeCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
            {activeCount}
          </Badge>
        )}
      </Button>

      {/* Active Filter Chips (outside sheet, below trigger) */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => {
                  const newValues = { ...values };
                  const filterConfig = filters.find((f) => f.id === filter.id);
                  if (filterConfig?.type === 'checkbox') {
                    newValues[filter.id] = false;
                  } else if (filterConfig?.type === 'multi-select') {
                    newValues[filter.id] = [];
                  } else {
                    newValues[filter.id] = 'all';
                  }
                  onChange(newValues);
                }}
                className="rounded-full hover:bg-secondary-foreground/20 p-0.5"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Sheet */}
      <MobileBottomSheet
        open={open}
        onOpenChange={handleOpen}
        title="Filter"
        description="Pilih filter untuk menyaring data"
      >
        <div className="space-y-4">
          {/* Filter Controls */}
          {filters.map((filter) => (
            <div key={filter.id}>
              <Label className="text-sm font-medium mb-2 block">
                {filter.label}
              </Label>

              {filter.type === 'select' && (
                <Select
                  value={String(tempValues[filter.id] || 'all')}
                  onValueChange={(value) => handleFilterChange(filter.id, value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={filter.placeholder || 'Pilih...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filter.type === 'checkbox' && (
                <div className="flex items-center gap-3 h-11">
                  <Checkbox
                    id={filter.id}
                    checked={Boolean(tempValues[filter.id])}
                    onCheckedChange={(checked) =>
                      handleFilterChange(filter.id, Boolean(checked))
                    }
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Aktifkan filter
                  </label>
                </div>
              )}

              {filter.type === 'multi-select' && (
                <div className="space-y-2 border rounded-md p-3">
                  {filter.options?.map((option) => {
                    const currentValues = (tempValues[filter.id] as string[]) || [];
                    const isChecked = currentValues.includes(option.value);

                    return (
                      <div key={option.value} className="flex items-center gap-3">
                        <Checkbox
                          id={`${filter.id}-${option.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newValues = checked
                              ? [...currentValues, option.value]
                              : currentValues.filter((v) => v !== option.value);
                            handleFilterChange(filter.id, newValues);
                          }}
                        />
                        <label
                          htmlFor={`${filter.id}-${option.value}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              className="w-full h-11"
              onClick={handleApply}
            >
              Terapkan Filter
            </Button>
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleReset}
            >
              Reset Semua
            </Button>
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
}
