import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  Settings,
  HelpCircle,
  BookOpen,
  Video,
  HeadphonesIcon,
  ChevronRight,
  Keyboard,
} from 'lucide-react';
import { useOpenShortcutsDialog } from '../global-shortcuts-dialog';
import { getModKey } from '@/config/keyboard-shortcuts.config';

function getRoleBadgeColor(role: string) {
  switch (role?.toLowerCase()) {
    case 'owner':
    case 'super_admin':
      return 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary';
    case 'manager':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    case 'supervisor':
      return 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-300';
  }
}

export function HeaderUserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const openShortcutsDialog = useOpenShortcutsDialog();
  const modKey = getModKey();

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg p-1.5 transition-all duration-200 hover:bg-accent">
          <Avatar className="h-7 w-7 ring-1 ring-border transition-all duration-200 hover:ring-primary/50">
            {user?.profilePhotoUrl ? (
              <AvatarImage src={user.profilePhotoUrl} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-xs font-medium leading-none">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.outletName || 'Unassigned'}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* User Info Section */}
        <DropdownMenuLabel className="pb-3">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant="secondary" className={getRoleBadgeColor(user?.role || '')}>
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            {user?.outletName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-green-500"></span>
                {user.outletName}
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Account Section */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('/app/profile')} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/app/settings/business')} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Help Section */}
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help & Support</span>
              <ChevronRight className="ml-auto h-4 w-4" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuItem onClick={() => navigate('/app/help')} className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Help Center</span>
                <DropdownMenuShortcut>⌘?</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/help/tutorials')} className="cursor-pointer">
                <Video className="mr-2 h-4 w-4" />
                <span>Video Tutorials</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openShortcutsDialog} className="cursor-pointer">
                <Keyboard className="mr-2 h-4 w-4" />
                <span>Keyboard Shortcuts</span>
                <DropdownMenuShortcut>
                  {modKey}/
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.open('https://wa.me/6281234567890', '_blank')}
                className="cursor-pointer"
              >
                <HeadphonesIcon className="mr-2 h-4 w-4" />
                <span>Contact Support</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
          <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
