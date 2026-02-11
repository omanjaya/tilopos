import { useLocation } from 'react-router-dom';
import { OutletSelector } from '../outlet-selector';
import { ThemeToggle } from '../theme-toggle';
import { SyncIndicator } from '../sync-indicator';
import { NotificationBell } from '../notification-bell';
import { Separator } from '@/components/ui/separator';
import { HeaderUserMenu } from './header-user-menu';
import { getPageTitle } from './page-titles';

export function Header() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      {/* Left: Page title + outlet selector */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{pageTitle}</h2>
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
