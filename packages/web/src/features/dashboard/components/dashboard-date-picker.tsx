import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import type { DateRangeValue } from '../hooks/use-moka-dashboard';

interface DashboardDatePickerProps {
  dateRange: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  className?: string;
}

const presets = [
  { label: 'Hari Ini', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Minggu Ini', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { label: 'Bulan Ini', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
];

export function DashboardDatePicker({ dateRange, onChange, className }: DashboardDatePickerProps) {
  const label = `${format(dateRange.from, 'd MMM', { locale: id })} - ${format(dateRange.to, 'd MMM yyyy', { locale: id })}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start gap-2 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex gap-2 border-b p-3">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onChange(preset.getValue())}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(value) => {
            if (!value || value instanceof Date) return;
            if (value.from) {
              onChange({ from: value.from, to: value.to ?? value.from });
            }
          }}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
