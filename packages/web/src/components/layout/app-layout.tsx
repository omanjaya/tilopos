import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './sidebar/index';
import { Header } from './header/index';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useFeatureStore } from '@/stores/feature.store';
import { featuresApi } from '@/api/endpoints/features.api';
import { useGlobalShortcuts } from '@/hooks/use-global-shortcuts';
import { useBrandTheme } from '@/hooks/use-brand-theme';
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
import { MobileNav } from '@/components/shared/mobile-nav';
import { useMediaQuery, BREAKPOINTS } from '@/hooks/use-media-query';

export function AppLayout() {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const user = useAuthStore((s) => s.user);
  const { openOnboarding, completeOnboarding } = useOnboarding();
  const { completeOnboarding: apiCompleteOnboarding } = useCompleteOnboarding();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);

  // Business type migration for existing users
  const { shouldShowPrompt: showMigrationModal, setPrompted: setMigrationPrompted } = useBusinessTypeMigration();

  // Enable global keyboard shortcuts across the app
  useGlobalShortcuts();

  // Apply brand color theme
  useBrandTheme();

  // Fetch enabled features — per outlet when available, fallback to business-level
  const setEnabledFeatures = useFeatureStore((s) => s.setEnabledFeatures);
  const setBusinessType = useFeatureStore((s) => s.setBusinessType);
  const setOutletType = useFeatureStore((s) => s.setOutletType);
  const setCurrentOutletId = useFeatureStore((s) => s.setCurrentOutletId);
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const setBrandColor = useUIStore((s) => s.setBrandColor);

  // Determine active outlet: selectedOutletId from UI store or from JWT
  const activeOutletId = selectedOutletId || user?.outletId || null;

  useEffect(() => {
    if (activeOutletId) {
      // Load outlet-level features and type
      setCurrentOutletId(activeOutletId);
      featuresApi.getOutletEnabledFeatures(activeOutletId).then(setEnabledFeatures).catch(() => {
        // Fallback to business-level
        featuresApi.getEnabledFeatures().then(setEnabledFeatures).catch(() => setEnabledFeatures([]));
      });
      featuresApi.getOutletType(activeOutletId).then((data) => {
        setOutletType(data.outletType?.code ?? null);
      }).catch(() => {
        // Fallback to business-level type
        featuresApi.getBusinessType().then((data) => {
          setBusinessType(data.businessType?.code ?? null);
        }).catch(() => { });
      });
    } else {
      // No outlet context — use business-level (legacy)
      setCurrentOutletId(null);
      featuresApi.getEnabledFeatures().then(setEnabledFeatures).catch(() => setEnabledFeatures([]));
      featuresApi.getBusinessType().then((data) => {
        setBusinessType(data.businessType?.code ?? null);
      }).catch(() => { });
    }

    // Sync brand color from server
    import('@/api/endpoints/settings.api').then(({ settingsApi }) => {
      settingsApi.getBusiness().then((biz) => {
        const color = (biz?.settings as Record<string, unknown> | null)?.brandColor as string | undefined;
        if (color) setBrandColor(color);
      }).catch(() => { });
    });
  }, [activeOutletId, setEnabledFeatures, setBusinessType, setOutletType, setCurrentOutletId, setBrandColor]);

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

  // Auto-collapse sidebar on tablet devices for better spacing
  useEffect(() => {
    if (isTablet && !collapsed) {
      setSidebarCollapsed(true);
    }
  }, [isTablet, collapsed, setSidebarCollapsed]);

  // Sync server onboarding status to localStorage on login
  useEffect(() => {
    if (user?.onboardingCompleted) {
      localStorage.setItem('tilo_onboarding_completed', 'true');
    }
  }, [user?.onboardingCompleted]);

  // Check if user needs onboarding
  useEffect(() => {
    // Check if already completed via localStorage (client-side persistence)
    const localCompleted = localStorage.getItem('tilo_onboarding_completed') === 'true';
    if (localCompleted) return;

    // Check if already completed via server state
    if (user?.onboardingCompleted) return;

    // Allow disabling auto-show via localStorage for development
    const disableAutoShow = localStorage.getItem('tilo-disable-onboarding-autoshow') === 'true';
    if (disableAutoShow) return;

    const shouldShowOnboarding =
      user &&
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
    // Always close the modal first to prevent stuck overlay
    completeOnboarding();
    try {
      await apiCompleteOnboarding();
    } catch {
      // API failure is non-critical — localStorage already persisted
    }
  };

  return (
    <RealtimeProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Mobile sidebar overlay */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-[51] bg-black/50 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar - fixed position */}
          <div
            className={cn(
              'fixed left-0 top-0 z-[52] h-screen transition-transform duration-300 md:z-40',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
              'md:translate-x-0'
            )}
          >
            <Sidebar />
          </div>

          {/* Mobile close button (only visible when sidebar is open on mobile) */}
          {mobileSidebarOpen && (
            <button
              className="md:hidden fixed top-4 right-4 z-[53] p-2 rounded-md bg-background shadow-lg"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Main content area - responsive margin */}
          <div
            className={cn(
              'transition-all duration-300',
              // Mobile: no margin (sidebar is off-screen)
              'ml-0',
              // Tablet/Desktop (md+): margin based on sidebar state
              collapsed ? 'md:ml-[72px]' : 'md:ml-64'
            )}
          >
            <Header />
            <main className={cn(
              "px-4 py-4 md:px-6 md:py-6 lg:px-10",
              // Add bottom padding on mobile for MobileNav
              "pb-24 md:pb-6"
            )}>
              <Outlet />
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && <MobileNav />}

          {/* Floating Help Button - Re-open Onboarding */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openOnboarding}
                size="icon"
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all z-30"
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
