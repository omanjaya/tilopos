import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUIStore } from '@/stores/ui.store';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { GlobalShortcutsDialog } from './global-shortcuts-dialog';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  // Enable global keyboard shortcuts across the app
  useGlobalShortcuts();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all duration-300', collapsed ? 'ml-16' : 'ml-60')}>
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <GlobalShortcutsDialog />
    </div>
  );
}
