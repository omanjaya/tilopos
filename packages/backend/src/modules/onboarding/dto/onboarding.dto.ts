import { IsOptional } from 'class-validator';

/**
 * Progress status for a single onboarding step
 */
export interface OnboardingStepStatus {
  done: boolean;
}

/**
 * Progress status for a step with count and target
 */
export interface OnboardingStepStatusWithCount extends OnboardingStepStatus {
  count: number;
  target?: number;
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

/**
 * DTO for dismissing the onboarding checklist
 */
export class DismissOnboardingDto {
  @IsOptional()
  dismissed?: boolean;
}
