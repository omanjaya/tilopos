import { Fragment, useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useOnboarding } from './onboarding-provider';
import { useOnboardingSetupStore } from './onboarding-setup.store';
import { templatesApi } from '@/api/endpoints/templates.api';
import { useUIStore } from '@/stores/ui.store';
import { toast } from '@/lib/toast-utils';
import { WelcomeStep } from './steps/welcome-step';
import { BusinessTypeStep } from './steps/business-type-step';
import { TemplateStep } from './steps/template-step';
import { PaymentStep } from './steps/payment-step';
import { EmployeeStep } from './steps/employee-step';
import { CompleteStep } from './steps/complete-step';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const steps = [
  { id: 'welcome', title: 'Selamat Datang' },
  { id: 'business-type', title: 'Tipe Bisnis' },
  { id: 'template', title: 'Template' },
  { id: 'payment', title: 'Pembayaran' },
  { id: 'employee', title: 'Karyawan' },
  { id: 'complete', title: 'Selesai' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { state, closeOnboarding, nextStep, prevStep, skipOnboarding, goToStep, completeOnboarding } = useOnboarding();
  const setupStore = useOnboardingSetupStore();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);

  const applyMutation = useMutation({
    mutationFn: (params: { outletId: string; typeCode: string; sections: typeof setupStore.templateSections }) =>
      templatesApi.apply({
        outletId: params.outletId,
        typeCode: params.typeCode,
        sections: params.sections,
      }),
  });

  const handleSkip = useCallback(() => {
    setupStore.reset();
    skipOnboarding();
  }, [skipOnboarding, setupStore]);

  const handleComplete = useCallback(async () => {
    setIsApplying(true);
    try {
      // Apply template if business type selected and outlet exists
      if (setupStore.businessType && selectedOutletId) {
        const result = await applyMutation.mutateAsync({
          outletId: selectedOutletId,
          typeCode: setupStore.businessType,
          sections: setupStore.templateSections,
        });

        toast.success({
          title: 'Template berhasil diterapkan',
          description: `${result.categories} kategori, ${result.products} produk berhasil dibuat.`,
        });

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
      }

      setupStore.reset();
      completeOnboarding();
      onComplete?.();
    } catch {
      toast.error({
        title: 'Gagal menerapkan template',
        description: 'Silakan coba lagi atau lewati langkah ini.',
      });
    } finally {
      setIsApplying(false);
    }
  }, [setupStore, selectedOutletId, applyMutation, queryClient, completeOnboarding, onComplete]);

  if (!state.isOpen) {
    return null;
  }

  // Only show progress for steps 1-5 (skip welcome at index 0)
  const progressSteps = steps.slice(1);
  const progressIndex = state.currentStep - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
        {/* Close Button */}
        <button
          onClick={closeOnboarding}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Progress Indicator (hidden on welcome step) */}
        {state.currentStep > 0 && (
          <>
            <div className="mb-4 flex items-center justify-center gap-2">
              {progressSteps.map((step, idx) => (
                <Fragment key={step.id}>
                  <button
                    onClick={() => idx < progressIndex && goToStep(idx + 1)}
                    className={`
                      flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors
                      ${idx <= progressIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                      ${idx < progressIndex ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    disabled={idx >= progressIndex}
                  >
                    {idx < progressIndex ? '\u2713' : idx + 1}
                  </button>
                  {idx < progressSteps.length - 1 && (
                    <div className={`h-0.5 w-6 ${idx < progressIndex ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </Fragment>
              ))}
            </div>
            <div className="mb-4 flex justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                Langkah {progressIndex + 1} dari {progressSteps.length}: {progressSteps[progressIndex]?.title || ''}
              </span>
            </div>
          </>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {state.currentStep === 0 && (
            <WelcomeStep key="welcome" onNext={nextStep} onSkip={handleSkip} />
          )}

          {state.currentStep === 1 && (
            <BusinessTypeStep
              key="business-type"
              selectedType={setupStore.businessType}
              onSelect={(type) => setupStore.setBusinessType(type)}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={handleSkip}
            />
          )}

          {state.currentStep === 2 && setupStore.businessType && (
            <TemplateStep
              key="template"
              typeCode={setupStore.businessType}
              sections={setupStore.templateSections}
              onToggleSection={(key) =>
                setupStore.setTemplateSections({ [key]: !setupStore.templateSections[key] })
              }
              onNext={nextStep}
              onBack={prevStep}
              onSkip={handleSkip}
            />
          )}

          {/* Skip template step if no business type */}
          {state.currentStep === 2 && !setupStore.businessType && (
            <PaymentStep
              key="payment-fallback"
              selectedMethods={setupStore.paymentMethods}
              taxRate={setupStore.taxRate}
              onToggleMethod={(method) => {
                const methods = setupStore.paymentMethods.includes(method)
                  ? setupStore.paymentMethods.filter((m) => m !== method)
                  : [...setupStore.paymentMethods, method];
                setupStore.setPaymentMethods(methods);
              }}
              onTaxRateChange={(rate) => setupStore.setTaxRate(rate)}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={handleSkip}
            />
          )}

          {state.currentStep === 3 && (
            <PaymentStep
              key="payment"
              selectedMethods={setupStore.paymentMethods}
              taxRate={setupStore.taxRate}
              onToggleMethod={(method) => {
                const methods = setupStore.paymentMethods.includes(method)
                  ? setupStore.paymentMethods.filter((m) => m !== method)
                  : [...setupStore.paymentMethods, method];
                setupStore.setPaymentMethods(methods);
              }}
              onTaxRateChange={(rate) => setupStore.setTaxRate(rate)}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={handleSkip}
            />
          )}

          {state.currentStep === 4 && (
            <EmployeeStep
              key="employee"
              onNext={(data) => {
                setupStore.setEmployee(data);
                nextStep();
              }}
              onBack={prevStep}
              onSkip={() => {
                setupStore.setEmployee(null);
                nextStep();
              }}
              defaultValues={setupStore.employee ?? undefined}
            />
          )}

          {state.currentStep === 5 && (
            <CompleteStep
              key="complete"
              summary={{
                businessType: setupStore.businessType,
                templateSections: setupStore.templateSections,
                paymentMethods: setupStore.paymentMethods,
                hasEmployee: !!setupStore.employee,
              }}
              isApplying={isApplying}
              onComplete={handleComplete}
              onBack={prevStep}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
