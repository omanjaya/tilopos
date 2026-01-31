import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface OnboardingState {
  isOpen: boolean;
  currentStep: number;
  skipped: boolean;
  completed: boolean;
}

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
}

export function OnboardingProvider({
  children,
  initialCompleted = false,
  onCompletedChange,
}: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>({
    isOpen: !initialCompleted,
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
      currentStep: Math.min(prev.currentStep + 1, 3), // 4 steps: 0-3
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
      currentStep: Math.max(0, Math.min(step, 3)),
    }));
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      skipped: true,
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      completed: true,
      currentStep: 3,
    }));
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
