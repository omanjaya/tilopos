import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { GlobalShortcutsDialog } from './global-shortcuts-dialog';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { useCompleteOnboarding } from '@/features/onboarding/use-onboarding';
import { CommandPalette, useCommandPalette } from '@/components/shared/command-palette';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const { openOnboarding, completeOnboarding } = useOnboarding();
  const { completeOnboarding: apiCompleteOnboarding } = useCompleteOnboarding();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Enable global keyboard shortcuts across the app
  useGlobalShortcuts();

  // Auto-collapse sidebar on POS and KDS pages for maximum screen space
  useEffect(() => {
    const autoCollapsePaths = ['/pos', '/kds'];
    const shouldAutoCollapse = autoCollapsePaths.some(path => location.pathname.startsWith(path));

    if (shouldAutoCollapse && !collapsed) {
      // Only auto-collapse if user hasn't manually set preference
      const hasManualPreference = localStorage.getItem('sidebarCollapsed') !== null;
      if (!hasManualPreference) {
        setSidebarCollapsed(true);
      }
    }
  }, [location.pathname, collapsed, setSidebarCollapsed]);

  // Check if user needs onboarding
  useEffect(() => {
    const shouldShowOnboarding =
      user &&
      !user.onboardingCompleted &&
      user.role !== 'cashier' &&
      user.role !== 'kitchen';

    if (shouldShowOnboarding) {
      // Small delay to allow app to render first
      const timer = setTimeout(() => {
        openOnboarding();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, openOnboarding]);

  const handleOnboardingComplete = async () => {
    await apiCompleteOnboarding();
    completeOnboarding();
    // Update user state will be handled by API response
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all duration-300', collapsed ? 'ml-[72px]' : 'ml-64')}>
        <Header />
        <main className="px-12 py-8">
          <Outlet />
        </main>
      </div>
      <GlobalShortcutsDialog />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <OnboardingWizard onComplete={handleOnboardingComplete} />
    </div>
  );
}
