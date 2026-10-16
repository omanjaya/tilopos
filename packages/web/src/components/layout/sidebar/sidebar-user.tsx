import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, requestLogout } from '@/stores/auth.store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_LABELS } from './sidebar-nav-data';
import type { EmployeeRole } from '@/types/auth.types';

export function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const userRole = (user?.role ?? 'cashier') as EmployeeRole;

  const userInitials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // requestLogout warns about unsynced offline sales before clearing the session
  const handleLogout = async () => {
    if (await requestLogout()) {
      navigate('/login');
    }
  };

  return (
    <div className="shrink-0 border-t border-sidebar-border bg-sidebar">
      <div className={cn('flex items-center gap-1 px-2.5 py-2.5', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          aria-label={`Profil saya: ${user?.name ?? 'Pengguna'}`}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2',
            'transition-all duration-200 hover:bg-sidebar-accent',
            !collapsed && 'hover:translate-x-0.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-border">
            <AvatarImage src={user?.profilePhotoUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user?.name ?? 'Pengguna'}</p>
              <p className="truncate text-[11px] text-sidebar-muted-foreground">{ROLE_LABELS[userRole]}</p>
            </div>
          )}
        </button>
        {!collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Keluar"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted-foreground/50 transition-all duration-200 hover:bg-destructive/15 hover:text-destructive hover:scale-110 focus-visible:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Keluar</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
