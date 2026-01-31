import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | { from?: Date; to?: Date };
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    if (disabled && disabled(day)) return;

    if (mode === 'single') {
      onSelect?.(day);
    } else if (mode === 'range') {
      const range = selected as { from?: Date; to?: Date } | undefined;
      if (!range?.from || (range.from && range.to)) {
        onSelect?.({ from: day, to: undefined });
      } else {
        const from = range.from;
        const to = day;
        onSelect?.({ from: from < to ? from : to, to: from < to ? to : from });
      }
    }
  };

  const isSelected = (day: Date) => {
    if (mode === 'single' && selected instanceof Date) {
      return isSameDay(day, selected);
    } else if (mode === 'range' && selected && typeof selected === 'object') {
      const range = selected as { from?: Date; to?: Date };
      if (range.from && range.to) {
        return isWithinInterval(day, { start: range.from, end: range.to });
      }
      return range.from && isSameDay(day, range.from);
    }
    return false;
  };

  const isRangeStart = (day: Date) => {
    if (mode === 'range' && selected && typeof selected === 'object') {
      const range = selected as { from?: Date; to?: Date };
      return range.from && isSameDay(day, range.from);
    }
    return false;
  };

  const isRangeEnd = (day: Date) => {
    if (mode === 'range' && selected && typeof selected === 'object') {
      const range = selected as { from?: Date; to?: Date };
      return range.to && isSameDay(day, range.to);
    }
    return false;
  };

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <div className={clsx('p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 hover:bg-accent rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-semibold">
          {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 hover:bg-accent rounded-md"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isDisabled = disabled && disabled(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const selected = isSelected(day);
          const rangeStart = isRangeStart(day);
          const rangeEnd = isRangeEnd(day);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={clsx(
                'h-9 w-9 text-sm rounded-md transition-colors',
                !isCurrentMonth && 'text-muted-foreground opacity-50',
                isDisabled && 'cursor-not-allowed opacity-30',
                selected && 'bg-primary text-primary-foreground',
                !selected && !isDisabled && 'hover:bg-accent',
                (rangeStart || rangeEnd) && 'font-semibold'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
