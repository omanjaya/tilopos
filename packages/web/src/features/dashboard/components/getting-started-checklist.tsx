import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SuccessCheckmark } from '@/components/shared/success-checkmark';
import { toast } from '@/lib/toast-utils';
import { apiClient } from '@/api/client';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Package,
  CreditCard,
  Users,
  Monitor,
  Printer,
  X,
} from 'lucide-react';

/**
 * Onboarding progress response type
 */
interface OnboardingProgress {
  isDismissed: boolean;
  isCompleted: boolean;
  steps: {
    createAccount: boolean;
    addProducts: boolean;
    productCount: number;
    setupPayments: boolean;
    addEmployees: boolean;
    firstTransaction: boolean;
    setupPrinter: boolean;
  };
  progress: number; // 0-100
}

/**
 * API client for onboarding endpoints
 */
const onboardingApi = {
  getProgress: () =>
    apiClient
      .get<OnboardingProgress>('/onboarding/progress')
      .then((r) => r.data),

  dismiss: () =>
    apiClient.post('/onboarding/dismiss').then((r) => r.data),
};

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  ctaPath: string;
  optional?: boolean;
  badge?: string;
}

interface GettingStartedChecklistProps {
  className?: string;
}

/**
 * Getting Started Checklist Component
 *
 * Displays an onboarding checklist for new users with:
 * - Progress tracking (0-100%)
 * - CTA buttons for each incomplete step
 * - Celebration when all steps completed
 * - Dismiss/skip option
 */
export function GettingStartedChecklist({ className }: GettingStartedChecklistProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationShownRef = useRef(false);

  // Fetch onboarding progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding', 'progress'],
    queryFn: () => onboardingApi.getProgress(),
    retry: false,
  });

  // Hide if dismissed, completed, or error occurred
  const shouldShow = progress && !progress.isDismissed && !progress.isCompleted;
  const isCompleted = progress?.isCompleted ?? false;

  // Show celebration only once per session (persisted via sessionStorage)
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('onboarding-celebration-shown');
    if (isCompleted && !alreadyShown && !celebrationShownRef.current) {
      celebrationShownRef.current = true;
      sessionStorage.setItem('onboarding-celebration-shown', '1');
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  // Handle dismiss
  const handleDismiss = async () => {
    try {
      await onboardingApi.dismiss();
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'progress'] });
      toast.success({
        title: 'Checklist dilewati',
        description: 'Anda bisa mengakses checklist ini kembali melalui Pengaturan',
      });
    } catch {
      toast.error({
        title: 'Gagal menyimpan',
        description: 'Terjadi kesalahan saat menyimpan preferensi Anda',
      });
    }
  };

  // Handle CTA click
  const handleCtaClick = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <Card
        className={cn(
          'border-gradient-to-r from-blue-500/20 to-purple-500/20',
          className
        )}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="space-y-2 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shouldShow && !showCelebration) {
    return null;
  }

  // Build checklist items
  const checklistItems: ChecklistItem[] = [
    {
      id: 'createAccount',
      label: 'Buat akun',
      completed: progress?.steps.createAccount ?? true,
      icon: CheckCircle2,
      ctaLabel: 'Selesai',
      ctaPath: '#',
    },
    {
      id: 'addProducts',
      label: 'Tambah produk',
      completed: progress?.steps.addProducts ?? false,
      icon: Package,
      ctaLabel: 'Tambah Produk',
      ctaPath: '/app/products/new',
      badge: `${progress?.steps.productCount ?? 0}/5`,
    },
    {
      id: 'setupPayments',
      label: 'Atur metode pembayaran',
      completed: progress?.steps.setupPayments ?? false,
      icon: CreditCard,
      ctaLabel: 'Atur Pembayaran',
      ctaPath: '/app/settings?tab=payments',
    },
    {
      id: 'addEmployees',
      label: 'Tambah karyawan',
      completed: progress?.steps.addEmployees ?? false,
      icon: Users,
      ctaLabel: 'Tambah Karyawan',
      ctaPath: '/app/employees/new',
    },
    {
      id: 'firstTransaction',
      label: 'Transaksi pertama',
      completed: progress?.steps.firstTransaction ?? false,
      icon: Monitor,
      ctaLabel: 'Buka POS',
      ctaPath: '/pos',
    },
    {
      id: 'setupPrinter',
      label: 'Atur printer',
      completed: progress?.steps.setupPrinter ?? false,
      icon: Printer,
      ctaLabel: 'Atur Printer',
      ctaPath: '/app/settings?tab=devices',
      optional: true,
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.filter((item) => !item.optional).length;
  const calculatedProgress = progress?.progress ?? Math.round((completedCount / totalCount) * 100);

  return (
    <>
      {/* Celebration overlay — portaled to body so fixed positioning isn't broken by parent transitions */}
      {showCelebration && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="relative mx-4 max-w-md animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <SuccessCheckmark size="lg" className="mb-4" />
              <h3 className="text-2xl font-bold">Selamat!</h3>
              <p className="mt-2 text-muted-foreground">
                Anda telah menyelesaikan semua langkah onboarding.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                TiloPOS siap digunakan. Semoga bisnis Anda sukses!
              </p>
            </CardContent>
          </Card>
        </div>,
        document.body,
      )}

      {/* Main checklist card */}
      {shouldShow && (
        <Card
          className={cn(
            'relative overflow-hidden border-gradient-to-r from-blue-500/20 to-purple-500/20',
            className
          )}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Tutup checklist"
          >
            <X className="h-4 w-4" />
          </button>

          <CardHeader>
            <CardTitle>Selamat Datang di TiloPOS!</CardTitle>
            <CardDescription>
              Selesaikan langkah berikut untuk memulai
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{calculatedProgress}%</span>
              </div>
              <Progress value={calculatedProgress} className="h-2" />
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              {checklistItems.map((item) => {
                const Icon = item.completed ? CheckCircle2 : Circle;
                const isDisabled = item.completed || item.id === 'createAccount';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      item.completed
                        ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
                        : 'border-border bg-background',
                      item.optional && !item.completed && 'opacity-75'
                    )}
                  >
                    {/* Status icon */}
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        item.completed
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                      )}
                    />

                    {/* Label */}
                    <div className="flex-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          item.completed && 'text-green-700 dark:text-green-300'
                        )}
                      >
                        {item.label}
                      </span>
                      {item.optional && !item.completed && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Opsional)
                        </span>
                      )}
                    </div>

                    {/* Badge */}
                    {item.badge && !item.completed && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.badge}
                      </span>
                    )}

                    {/* CTA button */}
                    <Button
                      size="sm"
                      variant={item.completed ? 'ghost' : 'default'}
                      disabled={isDisabled}
                      onClick={() => handleCtaClick(item.ctaPath)}
                      className={cn(
                        'h-7 text-xs',
                        item.completed && 'text-green-700 hover:text-green-800 dark:text-green-300'
                      )}
                    >
                      {item.completed ? 'Selesai' : item.ctaLabel}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Skip button */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Lewati untuk sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
