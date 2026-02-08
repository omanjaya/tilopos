import { Crown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { KDSOrderPriority } from '@/types/kds.types';

interface PriorityBadgeProps {
  priority: KDSOrderPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  if (priority === 'vip') {
    return (
      <Badge className="bg-amber-500 text-black font-bold gap-1">
        <Crown className="h-3 w-3" />
        VIP
      </Badge>
    );
  }
  if (priority === 'urgent') {
    return (
      <Badge className="bg-orange-500 text-white font-bold gap-1">
        <AlertTriangle className="h-3 w-3" />
        Urgent
      </Badge>
    );
  }
  return null;
}
