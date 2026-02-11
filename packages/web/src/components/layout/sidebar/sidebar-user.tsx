import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_LABELS } from './sidebar-nav-data';
import type { EmployeeRole } from '@/types/auth.types';

export function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const userRole = (user?.role ?? 'cashier') as EmployeeRole;

  const userInitials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="shrink-0 border-t border-sidebar-border bg-sidebar">
      <div className={cn('px-2.5 py-2.5', collapsed && 'px-2')}>
        <button
          onClick={() => navigate('/app/profile')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2 py-2',
            'transition-all duration-200 hover:bg-sidebar-accent',
            !collapsed && 'hover:translate-x-0.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-border">
            <AvatarImage src={user?.profilePhotoUrl ?? undefined} />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user?.name ?? 'User'}</p>
              <p className="truncate text-[11px] text-sidebar-muted-foreground">{ROLE_LABELS[userRole]}</p>
            </div>
          )}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                    navigate('/login');
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted-foreground/50 transition-all duration-200 hover:bg-destructive/15 hover:text-destructive hover:scale-110"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Logout</p>
              </TooltipContent>
            </Tooltip>
          )}
        </button>
      </div>
    </div>
  );
}
