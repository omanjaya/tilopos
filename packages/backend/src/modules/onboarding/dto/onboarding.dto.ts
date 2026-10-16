/**
 * Progress status for a single onboarding step
 */
export interface OnboardingStepStatus {
  done: boolean;
}

/**
 * Complete onboarding progress response
 */
export interface OnboardingProgressResponse {
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
  completedAt: Date | null;
  progress: number;
}
