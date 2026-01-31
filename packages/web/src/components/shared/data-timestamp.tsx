import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface DataTimestampProps {
  timestamp?: Date;
  className?: string;
}

export function DataTimestamp({ timestamp, className }: DataTimestampProps) {
  if (!timestamp) return null;

  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true, locale: id });

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <Clock className="h-3.5 w-3.5" />
      <span>Data diperbarui {timeAgo}</span>
    </div>
  );
}
