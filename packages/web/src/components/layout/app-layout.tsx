import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useFeatureStore } from '@/stores/feature.store';
import { featuresApi } from '@/api/endpoints/features.api';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { GlobalShortcutsDialog } from './global-shortcuts-dialog';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { useCompleteOnboarding } from '@/features/onboarding/use-onboarding';
import { CommandPalette, useCommandPalette } from '@/components/shared/command-palette';
import { RealtimeProvider } from '@/components/shared/realtime-provider';
import { BusinessTypeMigrationModal, useBusinessTypeMigration } from '@/components/modals/business-type-migration-modal';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const { openOnboarding, completeOnboarding } = useOnboarding();
  const { completeOnboarding: apiCompleteOnboarding } = useCompleteOnboarding();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Business type migration for existing users
  const { shouldShowPrompt: showMigrationModal, setPrompted: setMigrationPrompted } = useBusinessTypeMigration();

  // Enable global keyboard shortcuts across the app
  useGlobalShortcuts();

  // Fetch enabled features on mount
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  const setBusinessType = useFeatureStore((s) => s.setBusinessType);
  useEffect(() => {
    featuresApi.getEnabledFeatures().then(setEnabledFeatures).catch(() => {
      // If feature API fails, show all features (graceful degradation)
      setEnabledFeatures([]);
    });
    featuresApi.getBusinessType().then((data) => {
      setBusinessType(data.businessType?.code ?? null);
    }).catch(() => { });
  }, [setEnabledFeatures, setBusinessType]);

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
    // Check if already completed via localStorage (client-side persistence)
    const localCompleted = localStorage.getItem('tilo_onboarding_completed') === 'true';
    if (localCompleted) return;

    // Allow disabling auto-show via localStorage for development
    const disableAutoShow = localStorage.getItem('tilo-disable-onboarding-autoshow') === 'true';
    if (disableAutoShow) return;

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
    <RealtimeProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <div className={cn('transition-all duration-300', collapsed ? 'ml-[72px]' : 'ml-64')}>
            <Header />
            <main className="px-12 py-8">
              <Outlet />
            </main>
          </div>

          {/* Floating Help Button - Re-open Onboarding */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openOnboarding}
                size="icon"
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Buka Panduan Onboarding</p>
            </TooltipContent>
          </Tooltip>

          <GlobalShortcutsDialog />
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
          <OnboardingWizard onComplete={handleOnboardingComplete} />
          <BusinessTypeMigrationModal
            open={showMigrationModal}
            onClose={setMigrationPrompted}
            onComplete={setMigrationPrompted}
          />
        </div>
      </TooltipProvider>
    </RealtimeProvider>
  );
}
