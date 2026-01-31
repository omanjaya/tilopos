import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './onboarding-provider';
import { WelcomeStep } from './steps/welcome-step';
import { BusinessStep } from './steps/business-step';
import { OutletStep } from './steps/outlet-step';
import { TourStep } from './steps/tour-step';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const steps = [
  { id: 'welcome', title: 'Selamat Datang' },
  { id: 'business', title: 'Informasi Bisnis' },
  { id: 'outlet', title: 'Outlet Pertama' },
  { id: 'tour', title: 'Fitur Utama' },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { state, closeOnboarding, nextStep, prevStep, skipOnboarding, goToStep } = useOnboarding();

  if (!state.isOpen) {
    return null;
  }

  const handleNext = (data?: unknown) => {
    if (state.currentStep === steps.length - 1) {
      // Last step - complete onboarding
      onComplete?.();
    } else {
      nextStep();
    }
  };

  const handleBack = () => {
    if (state.currentStep === 0) {
      closeOnboarding();
    } else {
      prevStep();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg">
        {/* Close Button */}
        <button
          onClick={closeOnboarding}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Progress Indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => goToStep(idx)}
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${idx <= state.currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                  }
                  ${idx < state.currentStep ? 'cursor-pointer' : 'cursor-default'}
                `}
                disabled={idx > state.currentStep}
              >
                {idx < state.currentStep ? '✓' : idx + 1}
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 ${
                    idx < state.currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Labels */}
        <div className="mb-6 flex justify-center">
          <span className="text-sm font-medium text-muted-foreground">
            Langkah {state.currentStep + 1} dari {steps.length}: {steps[state.currentStep].title}
          </span>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {state.currentStep === 0 && (
            <WelcomeStep
              key="welcome"
              onNext={handleNext}
              onSkip={skipOnboarding}
            />
          )}
          {state.currentStep === 1 && (
            <BusinessStep
              key="business"
              onNext={handleNext}
              onBack={handleBack}
              onSkip={skipOnboarding}
            />
          )}
          {state.currentStep === 2 && (
            <OutletStep
              key="outlet"
              onNext={handleNext}
              onBack={handleBack}
              onSkip={skipOnboarding}
            />
          )}
          {state.currentStep === 3 && (
            <TourStep
              key="tour"
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
