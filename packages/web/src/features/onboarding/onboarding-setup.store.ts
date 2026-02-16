import { create } from 'zustand';

interface OnboardingSetupState {
  currentStep: number;
  businessType: string | null;
  templateSections: {
    categories: boolean;
    products: boolean;
    modifiers: boolean;
    tables: boolean;
    units: boolean;
  };
  paymentMethods: string[];
  taxRate: number;
  employee: { name: string; email?: string; pin: string } | null;

  setCurrentStep: (step: number) => void;
  setBusinessType: (type: string) => void;
  setTemplateSections: (sections: Partial<OnboardingSetupState['templateSections']>) => void;
  setPaymentMethods: (methods: string[]) => void;
  setTaxRate: (rate: number) => void;
  setEmployee: (employee: OnboardingSetupState['employee']) => void;
  reset: () => void;
}

const STORAGE_KEY = 'tilo_onboarding_setup';

function loadState(): Partial<OnboardingSetupState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveState(state: Partial<OnboardingSetupState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentStep: state.currentStep,
    businessType: state.businessType,
    templateSections: state.templateSections,
    paymentMethods: state.paymentMethods,
    taxRate: state.taxRate,
    employee: state.employee,
  }));
}

const defaultSections = {
  categories: true,
  products: true,
  modifiers: true,
  tables: true,
  units: true,
};

const saved = loadState();

export const useOnboardingSetupStore = create<OnboardingSetupState>((set) => ({
  currentStep: saved.currentStep ?? 0,
  businessType: saved.businessType ?? null,
  templateSections: saved.templateSections ?? { ...defaultSections },
  paymentMethods: saved.paymentMethods ?? ['cash'],
  taxRate: saved.taxRate ?? 11,
  employee: saved.employee ?? null,

  setCurrentStep: (step) =>
    set((s) => {
      const next = { ...s, currentStep: step };
      saveState(next);
      return next;
    }),

  setBusinessType: (type) =>
    set((s) => {
      const next = { ...s, businessType: type };
      saveState(next);
      return next;
    }),

  setTemplateSections: (sections) =>
    set((s) => {
      const next = { ...s, templateSections: { ...s.templateSections, ...sections } };
      saveState(next);
      return next;
    }),

  setPaymentMethods: (methods) =>
    set((s) => {
      const next = { ...s, paymentMethods: methods };
      saveState(next);
      return next;
    }),

  setTaxRate: (rate) =>
    set((s) => {
      const next = { ...s, taxRate: rate };
      saveState(next);
      return next;
    }),

  setEmployee: (employee) =>
    set((s) => {
      const next = { ...s, employee };
      saveState(next);
      return next;
    }),

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      currentStep: 0,
      businessType: null,
      templateSections: { ...defaultSections },
      paymentMethods: ['cash'],
      taxRate: 11,
      employee: null,
    });
  },
}));
