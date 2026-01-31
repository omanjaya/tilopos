import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { clsx } from 'clsx';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const formatDateRange = (range?: DateRange) => {
    if (!range) return placeholder;
    if (range.from && range.to) {
      return `${format(range.from, 'dd MMM yyyy', { locale: idLocale })} - ${format(
        range.to,
        'dd MMM yyyy',
        { locale: idLocale }
      )}`;
    }
    if (range.from) {
      return format(range.from, 'dd MMM yyyy', { locale: idLocale });
    }
    return placeholder;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={clsx(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(range) => {
            onChange?.(range as DateRange | undefined);
            // Close popover when both dates are selected
            if (range && typeof range === 'object' && 'from' in range && 'to' in range && range.from && range.to) {
              setIsOpen(false);
            }
          }}
        />
        <div className="flex gap-2 p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange?.(undefined);
              setIsOpen(false);
            }}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
