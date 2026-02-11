import { NavLink } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './sidebar-nav-data';
import { exactMatchPaths } from './sidebar-nav-data';

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
  return (
    <div className="group/item relative">
      <NavLink
        to={item.to}
        end={item.to === '/app' || exactMatchPaths.has(item.to)}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium',
            'transition-all duration-200 ease-out',
            isActive
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm scale-[1.01]'
              : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5',
            collapsed && 'justify-center px-2 hover:translate-x-0',
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200',
                isActive ? 'bg-primary-foreground/15' : 'bg-transparent group-hover/item:scale-110',
                collapsed && 'h-8 w-8',
              )}
            >
              <item.icon className="h-4 w-4 transition-transform duration-200 group-hover/item:scale-105" />
            </div>
            {!collapsed && <span className="truncate">{item.label}</span>}
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
