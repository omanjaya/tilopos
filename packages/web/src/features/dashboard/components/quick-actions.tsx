import { useNavigate } from 'react-router-dom';
import {
  Monitor, Package, BarChart3, Settings,
  LayoutGrid, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  isFnB: boolean;
  isService: boolean;
  className?: string;
}

interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  iconBg: string;
}

export function QuickActions({ isFnB, isService, className }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions: ActionItem[] = [
    {
      label: 'Buka POS',
      icon: Monitor,
      path: '/pos',
      color: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      label: 'Produk',
      icon: Package,
      path: '/app/products',
      color: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    ...(isFnB
      ? [{
          label: 'Meja',
          icon: LayoutGrid,
          path: '/app/tables',
          color: 'text-orange-600 dark:text-orange-400',
          iconBg: 'bg-orange-100 dark:bg-orange-900/40',
        }]
      : isService
        ? [{
            label: 'Jadwal',
            icon: CalendarClock,
            path: '/app/appointments',
            color: 'text-violet-600 dark:text-violet-400',
            iconBg: 'bg-violet-100 dark:bg-violet-900/40',
          }]
        : [{
            label: 'Laporan',
            icon: BarChart3,
            path: '/app/reports',
            color: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
          }]),
    {
      label: 'Pengaturan',
      icon: Settings,
      path: '/app/settings',
      color: 'text-gray-600 dark:text-gray-400',
      iconBg: 'bg-gray-100 dark:bg-gray-800',
    },
  ];

  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <h3 className="font-semibold mb-4">Aksi Cepat</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-xl',
              'hover:bg-muted/50 transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', action.iconBg)}>
              <action.icon className={cn('h-5 w-5', action.color)} />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
