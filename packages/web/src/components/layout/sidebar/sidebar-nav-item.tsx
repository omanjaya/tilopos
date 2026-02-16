import { NavLink } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './sidebar-nav-data';
import { exactMatchPaths } from './sidebar-nav-data';
import { useUIStore } from '@/stores/ui.store';
import { useFeatureStore } from '@/stores/feature.store';

// Maps paths to their controlling feature keys for PRO badge display
const PATH_TO_FEATURE: Record<string, string> = {
  '/app/settings/outlets': 'multi_outlet',
  '/app/online-store': 'online_store',
  '/app/loyalty': 'customer_loyalty',
  '/app/promotions': 'promotions',
  '/app/promotions/vouchers': 'vouchers',
  '/app/customers/segments': 'customer_segments',
  '/app/self-order': 'self_order_qr',
  '/app/audit': 'audit_log',
};

export function SidebarNavItem({
  item,
  collapsed,
  isPinned,
  onTogglePin,
  showPinAction,
}: {
  item: NavItem;
  collapsed: boolean;
  isPinned?: boolean;
  onTogglePin?: (path: string) => void;
  showPinAction?: boolean;
}) {
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const isFeatureRestricted = useFeatureStore((s) => s.isFeatureRestricted);

  const featureKey = PATH_TO_FEATURE[item.to];
  const isRestricted = featureKey ? isFeatureRestricted(featureKey) : false;

  const handleNavClick = () => {
    // Close mobile sidebar after navigation
    setMobileSidebarOpen(false);
  };

  return (
    <div className="group/item relative">
      <NavLink
        to={item.to}
        end={item.to === '/app' || exactMatchPaths.has(item.to)}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-normal',
            'transition-all duration-200 ease-out',
            isActive
              ? 'bg-primary text-primary-foreground font-medium shadow-sm scale-[1.01]'
              : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5',
            collapsed && 'justify-center px-2 hover:translate-x-0',
          )
        }
        onClick={handleNavClick}
      >
        {({ isActive }) => (
          <>
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-200',
                isActive ? 'bg-primary-foreground/15' : 'bg-transparent group-hover/item:scale-110',
                collapsed && 'h-8 w-8',
              )}
            >
              <item.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover/item:scale-105" />
            </div>
            {!collapsed && (
              <span className="flex items-center gap-1 truncate">
                {item.label}
                {isRestricted && (
                  <span className="ml-auto shrink-0 rounded bg-gradient-to-r from-amber-500 to-orange-500 px-1 py-0 text-[8px] font-bold leading-tight text-white">
                    PRO
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </NavLink>

      {/* Pin/unpin button on hover */}
      {showPinAction && !collapsed && onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(item.to);
          }}
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md',
            'transition-all duration-200',
            isPinned
              ? 'text-amber-500 opacity-70 hover:opacity-100 hover:bg-sidebar-accent hover:scale-110'
              : 'opacity-0 group-hover/item:opacity-40 hover:!opacity-100 hover:bg-sidebar-accent hover:scale-110 text-sidebar-muted-foreground',
          )}
          title={isPinned ? 'Hapus dari favorit' : 'Pin ke favorit'}
        >
          <Pin className={cn('h-3 w-3 transition-transform duration-200', isPinned && 'fill-current')} />
        </button>
      )}
    </div>
  );
}
