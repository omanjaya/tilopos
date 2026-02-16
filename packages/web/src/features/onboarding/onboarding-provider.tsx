import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface OnboardingState {
  isOpen: boolean;
  currentStep: number;
  skipped: boolean;
  completed: boolean;
}

export const ONBOARDING_TOTAL_STEPS = 6; // 0=welcome, 1=business-type, 2=template, 3=payment, 4=employee, 5=complete
export const ONBOARDING_MAX_STEP = ONBOARDING_TOTAL_STEPS - 1;

interface OnboardingContextValue {
  state: OnboardingState;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  goToStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
  initialCompleted?: boolean;
  onCompletedChange?: (completed: boolean) => void;
  onSkipped?: () => void;
}

export function OnboardingProvider({
  children,
  initialCompleted = false,
  onCompletedChange,
  onSkipped,
}: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>({
    isOpen: false, // Never auto-open on mount; app-layout useEffect handles this
    currentStep: 0,
    skipped: false,
    completed: initialCompleted,
  });

  const openOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, currentStep: 0 }));
  }, []);

  const closeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, ONBOARDING_MAX_STEP),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, ONBOARDING_MAX_STEP)),
    }));
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      skipped: true,
      completed: true, // Mark as completed when skipped
    }));
    localStorage.setItem('tilo_onboarding_completed', 'true');
    onSkipped?.();
    onCompletedChange?.(true);
  }, [onSkipped, onCompletedChange]);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      completed: true,
      currentStep: 1,
    }));
    localStorage.setItem('tilo_onboarding_completed', 'true');
    onCompletedChange?.(true);
  }, [onCompletedChange]);

  const value: OnboardingContextValue = {
    state,
    openOnboarding,
    closeOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    goToStep,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
