import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { OutletSelector } from '../outlet-selector';
import { ThemeToggle } from '../theme-toggle';
import { SyncIndicator } from '../sync-indicator';
import { NotificationBell } from '../notification-bell';
import { Separator } from '@/components/ui/separator';
import { HeaderUserMenu } from './header-user-menu';
import { Breadcrumb } from '@/components/shared/breadcrumb';
import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';

export function Header() {
  const location = useLocation();
  const { toggleMobileSidebar } = useUIStore();

  // Don't show breadcrumb on fullscreen pages (POS, KDS, login)
  const hideBreadcrumbRoutes = ['/pos', '/kds', '/login', '/register'];
  const shouldHideBreadcrumb = hideBreadcrumbRoutes.some(route =>
    location.pathname.startsWith(route)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumb + outlet selector */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {/* Mobile hamburger button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={toggleMobileSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {shouldHideBreadcrumb ? (
          <h2 className="text-sm font-semibold tracking-tight truncate">
            {location.pathname === '/pos' ? 'POS' :
             location.pathname === '/kds' ? 'Kitchen Display' :
             location.pathname === '/login' ? 'Login' : 'Dashboard'}
          </h2>
        ) : (
          <div className="truncate min-w-0">
            <Breadcrumb />
          </div>
        )}
        <OutletSelector />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <SyncIndicator />
        <NotificationBell />
        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1.5 h-5" />

        <HeaderUserMenu />
      </div>
    </header>
  );
}
