import { Injectable, Logger } from '@nestjs/common';

// ==================== Types ====================

export enum SagaStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
  FAILED = 'failed',
}

export interface SagaStepResult {
  stepName: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * A single step in a saga. Each step must have an execute and compensate method.
 * The compensate method is called during rollback if a subsequent step fails.
 */
export interface SagaStep<TContext = Record<string, unknown>> {
  /** Unique name for this step */
  name: string;

  /** Execute the step. Receives the shared context which accumulates data across steps. */
  execute(context: TContext): Promise<TContext>;

  /** Compensate (undo) the step. Called during rollback in reverse order. */
  compensate(context: TContext): Promise<TContext>;
}

export interface SagaLog {
  sagaId: string;
  sagaName: string;
  status: SagaStatus;
  steps: SagaStepResult[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ==================== Saga Class ====================

/**
 * Saga chains multiple steps and handles rollback on failure.
 * Steps execute in order; if any step fails, all previously completed
 * steps are compensated in reverse order.
 */
export class Saga<TContext extends Record<string, unknown> = Record<string, unknown>> {
  private readonly logger = new Logger(Saga.name);
  private readonly steps: SagaStep<TContext>[] = [];
  private _status: SagaStatus = SagaStatus.PENDING;
  private _log: SagaLog;

  constructor(
    public readonly sagaId: string,
    public readonly sagaName: string,
  ) {
    this._log = {
      sagaId,
      sagaName,
      status: SagaStatus.PENDING,
      steps: [],
      startedAt: new Date(),
    };
  }

  get status(): SagaStatus {
    return this._status;
  }

  get log(): SagaLog {
    return { ...this._log };
  }

  /**
   * Add a step to the saga chain.
   */
  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute all steps in sequence. On failure, compensate in reverse.
   */
  async execute(initialContext: TContext): Promise<{ context: TContext; log: SagaLog }> {
    this._status = SagaStatus.RUNNING;
    this._log.status = SagaStatus.RUNNING;

    let context = { ...initialContext };
    const completedSteps: SagaStep<TContext>[] = [];

    for (const step of this.steps) {
      try {
        this.logger.debug(`Executing step: ${step.name} for saga ${this.sagaName}`);
        context = await step.execute(context);
        completedSteps.push(step);

        this._log.steps.push({
          stepName: step.name,
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        this.logger.error(
          `Step ${step.name} failed in saga ${this.sagaName}: ${errorMessage}`,
        );

        this._log.steps.push({
          stepName: step.name,
          success: false,
          error: errorMessage,
        });

        // Compensate completed steps in reverse order
        context = await this.compensate(completedSteps, context);

        this._status = SagaStatus.FAILED;
        this._log.status = SagaStatus.FAILED;
        this._log.completedAt = new Date();
        this._log.error = `Step ${step.name} failed: ${errorMessage}`;

        return { context, log: this.log };
      }
    }

    this._status = SagaStatus.COMPLETED;
    this._log.status = SagaStatus.COMPLETED;
    this._log.completedAt = new Date();

    return { context, log: this.log };
  }

  /**
   * Compensate all completed steps in reverse order.
   */
  private async compensate(
    completedSteps: SagaStep<TContext>[],
    context: TContext,
  ): Promise<TContext> {
    this._status = SagaStatus.COMPENSATING;
    this._log.status = SagaStatus.COMPENSATING;

    let currentContext = { ...context };

    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];
      try {
        this.logger.debug(
          `Compensating step: ${step.name} for saga ${this.sagaName}`,
        );
        currentContext = await step.compensate(currentContext);

        this._log.steps.push({
          stepName: `compensate:${step.name}`,
          success: true,
        });
      } catch (compensateError) {
        const msg = compensateError instanceof Error ? compensateError.message : 'Unknown error';
        this.logger.error(
          `Compensation failed for step ${step.name}: ${msg}`,
        );

        this._log.steps.push({
          stepName: `compensate:${step.name}`,
          success: false,
          error: msg,
        });
        // Continue compensating remaining steps even if one fails
      }
    }

    this._status = SagaStatus.COMPENSATED;
    this._log.status = SagaStatus.COMPENSATED;

    return currentContext;
  }
}

// ==================== Saga Orchestrator ====================

/**
 * SagaOrchestrator manages creation and execution of sagas.
 * It provides a factory method and keeps a log of all executed sagas.
 */
@Injectable()
export class SagaOrchestrator {
  private readonly logger = new Logger(SagaOrchestrator.name);
  private readonly sagaLogs: SagaLog[] = [];
  private sagaCounter = 0;

  /**
   * Create a new saga instance with a unique ID.
   */
  createSaga<TContext extends Record<string, unknown> = Record<string, unknown>>(
    sagaName: string,
  ): Saga<TContext> {
    this.sagaCounter++;
    const sagaId = `saga-${Date.now()}-${this.sagaCounter}`;
    return new Saga<TContext>(sagaId, sagaName);
  }

  /**
   * Execute a saga and record its result.
   */
  async executeSaga<TContext extends Record<string, unknown>>(
    saga: Saga<TContext>,
    context: TContext,
  ): Promise<{ context: TContext; log: SagaLog }> {
    this.logger.log(`Starting saga: ${saga.sagaName} (${saga.sagaId})`);

    const result = await saga.execute(context);
    this.sagaLogs.push(result.log);

    if (result.log.status === SagaStatus.COMPLETED) {
      this.logger.log(`Saga ${saga.sagaName} completed successfully`);
    } else {
      this.logger.warn(
        `Saga ${saga.sagaName} failed: ${result.log.error}`,
      );
    }

    return result;
  }

  /**
   * Get all recorded saga logs.
   */
  getSagaLogs(): SagaLog[] {
    return [...this.sagaLogs];
  }

  /**
   * Get a specific saga log by ID.
   */
  getSagaLog(sagaId: string): SagaLog | undefined {
    return this.sagaLogs.find(log => log.sagaId === sagaId);
  }
}
