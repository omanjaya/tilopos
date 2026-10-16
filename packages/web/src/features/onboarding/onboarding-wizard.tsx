import { Fragment, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useOnboarding } from './onboarding-provider';
import { useOnboardingSetupStore } from './onboarding-setup.store';
import { onboardingApi } from '@/api/endpoints/onboarding.api';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
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
  const queryClient = useQueryClient();

  // Everything the wizard collected is applied in one call to POST /onboarding/setup
  // (business type + features, template, payment methods, tax rate, first cashier).
  const setupMutation = useMutation({ mutationFn: onboardingApi.setup });
  const isApplying = setupMutation.isPending;

  const handleClose = useCallback(() => {
    // Never keep the cashier PIN around after the wizard closes
    setupStore.setEmployee(null);
    closeOnboarding();
  }, [closeOnboarding, setupStore]);

  const handleSkip = useCallback(() => {
    setupStore.reset();
    skipOnboarding();
  }, [skipOnboarding, setupStore]);

  const handleComplete = useCallback(async () => {
    try {
      const result = await setupMutation.mutateAsync({
        businessType: setupStore.businessType ?? undefined,
        template: setupStore.businessType ? { sections: setupStore.templateSections } : undefined,
        paymentMethods: setupStore.paymentMethods,
        taxRate: setupStore.taxRate,
        employee: setupStore.employee ?? undefined,
      });

      const parts: string[] = [];
      if (result.template.applied) {
        parts.push(`${result.template.categories} kategori, ${result.template.products} produk dibuat`);
      }
      if (result.paymentMethods.configured) {
        parts.push(`${result.paymentMethods.count} metode pembayaran diatur`);
      }
      if (result.employee.created) parts.push('kasir pertama ditambahkan');
      toast.success({
        title: 'Pengaturan awal selesai',
        description: parts.length > 0 ? parts.join(', ') : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['business-type'] });

      setupStore.reset();
      completeOnboarding();
      onComplete?.();
    } catch (err) {
      handleMutationError(err, 'Gagal menyimpan pengaturan awal');
    }
  }, [setupStore, setupMutation, queryClient, completeOnboarding, onComplete]);

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
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
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
