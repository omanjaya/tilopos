import {
  Saga,
  SagaOrchestrator,
  SagaStep,
  SagaStatus,
} from '../../src/infrastructure/events/saga-orchestrator';

describe('SagaOrchestrator', () => {
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    orchestrator = new SagaOrchestrator();
  });

  // ==========================================================================
  // Helpers
  // ==========================================================================

  function createStep(
    name: string,
    options?: {
      shouldFail?: boolean;
      compensateShouldFail?: boolean;
      sideEffect?: (ctx: Record<string, unknown>) => void;
    },
  ): SagaStep<Record<string, unknown>> {
    return {
      name,
      execute: jest.fn(async (ctx: Record<string, unknown>) => {
        if (options?.shouldFail) {
          throw new Error(`${name} failed`);
        }
        options?.sideEffect?.(ctx);
        return { ...ctx, [`${name}_executed`]: true };
      }),
      compensate: jest.fn(async (ctx: Record<string, unknown>) => {
        if (options?.compensateShouldFail) {
          throw new Error(`${name} compensation failed`);
        }
        return { ...ctx, [`${name}_compensated`]: true };
      }),
    };
  }

  // ==========================================================================
  // Saga completes successfully
  // ==========================================================================

  describe('successful saga execution', () => {
    it('should execute all steps in order and mark as completed', async () => {
      // Arrange
      const step1 = createStep('step-1');
      const step2 = createStep('step-2');
      const step3 = createStep('step-3');

      const saga = orchestrator.createSaga('TestSaga');
      saga.addStep(step1).addStep(step2).addStep(step3);

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.COMPLETED);
      expect(result.context['step-1_executed']).toBe(true);
      expect(result.context['step-2_executed']).toBe(true);
      expect(result.context['step-3_executed']).toBe(true);
      expect(step1.execute).toHaveBeenCalledTimes(1);
      expect(step2.execute).toHaveBeenCalledTimes(1);
      expect(step3.execute).toHaveBeenCalledTimes(1);
    });

    it('should not call compensate on any step when all succeed', async () => {
      // Arrange
      const step1 = createStep('step-1');
      const step2 = createStep('step-2');

      const saga = orchestrator.createSaga('TestSaga');
      saga.addStep(step1).addStep(step2);

      // Act
      await orchestrator.executeSaga(saga, {});

      // Assert
      expect(step1.compensate).not.toHaveBeenCalled();
      expect(step2.compensate).not.toHaveBeenCalled();
    });

    it('should pass context through step chain', async () => {
      // Arrange
      const step1: SagaStep<Record<string, unknown>> = {
        name: 'init',
        execute: jest.fn(async (ctx) => ({ ...ctx, orderId: 'order-1' })),
        compensate: jest.fn(async (ctx) => ctx),
      };

      const step2: SagaStep<Record<string, unknown>> = {
        name: 'process',
        execute: jest.fn(async (ctx) => {
          expect(ctx.orderId).toBe('order-1');
          return { ...ctx, processed: true };
        }),
        compensate: jest.fn(async (ctx) => ctx),
      };

      const saga = orchestrator.createSaga('ContextTest');
      saga.addStep(step1).addStep(step2);

      // Act
      const result = await orchestrator.executeSaga(saga, { initial: true });

      // Assert
      expect(result.context.initial).toBe(true);
      expect(result.context.orderId).toBe('order-1');
      expect(result.context.processed).toBe(true);
    });
  });

  // ==========================================================================
  // Saga rollback on failure
  // ==========================================================================

  describe('saga rollback on failure', () => {
    it('should compensate completed steps in reverse when a step fails', async () => {
      // Arrange
      const compensateOrder: string[] = [];

      const step1: SagaStep<Record<string, unknown>> = {
        name: 'step-1',
        execute: jest.fn(async (ctx) => ({ ...ctx, s1: true })),
        compensate: jest.fn(async (ctx) => {
          compensateOrder.push('step-1');
          return { ...ctx, s1_compensated: true };
        }),
      };

      const step2: SagaStep<Record<string, unknown>> = {
        name: 'step-2',
        execute: jest.fn(async (ctx) => ({ ...ctx, s2: true })),
        compensate: jest.fn(async (ctx) => {
          compensateOrder.push('step-2');
          return { ...ctx, s2_compensated: true };
        }),
      };

      const step3: SagaStep<Record<string, unknown>> = {
        name: 'step-3',
        execute: jest.fn(async () => {
          throw new Error('Step 3 boom');
        }),
        compensate: jest.fn(async (ctx) => ctx),
      };

      const saga = orchestrator.createSaga('FailingSaga');
      saga.addStep(step1).addStep(step2).addStep(step3);

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.FAILED);
      expect(result.log.error).toContain('step-3');
      expect(result.log.error).toContain('Step 3 boom');

      // Compensation should happen in reverse: step-2 first, then step-1
      expect(compensateOrder).toEqual(['step-2', 'step-1']);
      expect(step3.compensate).not.toHaveBeenCalled();
    });

    it('should mark saga as FAILED when first step fails', async () => {
      // Arrange
      const step1 = createStep('step-1', { shouldFail: true });
      const step2 = createStep('step-2');

      const saga = orchestrator.createSaga('FirstStepFail');
      saga.addStep(step1).addStep(step2);

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.FAILED);
      expect(step2.execute).not.toHaveBeenCalled();
      expect(step1.compensate).not.toHaveBeenCalled(); // No completed steps to compensate
    });
  });

  // ==========================================================================
  // Partial compensation
  // ==========================================================================

  describe('partial compensation', () => {
    it('should continue compensating remaining steps even if one compensation fails', async () => {
      // Arrange
      const step1 = createStep('step-1');
      const step2 = createStep('step-2', { compensateShouldFail: true });
      const step3 = createStep('step-3', { shouldFail: true });

      const saga = orchestrator.createSaga('PartialCompensation');
      saga.addStep(step1).addStep(step2).addStep(step3);

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.FAILED);
      // Both step-1 and step-2 should have had compensate called
      expect(step2.compensate).toHaveBeenCalledTimes(1);
      expect(step1.compensate).toHaveBeenCalledTimes(1);

      // Check that compensation failure is logged
      const compensateSteps = result.log.steps.filter((s) => s.stepName.startsWith('compensate:'));
      expect(compensateSteps).toHaveLength(2);
      const failedComp = compensateSteps.find((s) => s.stepName === 'compensate:step-2');
      expect(failedComp?.success).toBe(false);
      expect(failedComp?.error).toContain('compensation failed');
    });
  });

  // ==========================================================================
  // Saga with multiple steps
  // ==========================================================================

  describe('saga with multiple steps', () => {
    it('should handle a saga with 5 steps completing successfully', async () => {
      // Arrange
      const steps = Array.from({ length: 5 }, (_, i) => createStep(`step-${i + 1}`));

      const saga = orchestrator.createSaga('FiveStepSaga');
      for (const step of steps) {
        saga.addStep(step);
      }

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.COMPLETED);
      expect(result.log.steps).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(result.context[`step-${i + 1}_executed`]).toBe(true);
      }
    });

    it('should compensate only completed steps when step 3 of 5 fails', async () => {
      // Arrange
      const step1 = createStep('step-1');
      const step2 = createStep('step-2');
      const step3 = createStep('step-3', { shouldFail: true });
      const step4 = createStep('step-4');
      const step5 = createStep('step-5');

      const saga = orchestrator.createSaga('PartialSaga');
      saga.addStep(step1).addStep(step2).addStep(step3).addStep(step4).addStep(step5);

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.status).toBe(SagaStatus.FAILED);

      // Steps 1 and 2 were executed
      expect(step1.execute).toHaveBeenCalledTimes(1);
      expect(step2.execute).toHaveBeenCalledTimes(1);
      expect(step3.execute).toHaveBeenCalledTimes(1);

      // Steps 4 and 5 were never reached
      expect(step4.execute).not.toHaveBeenCalled();
      expect(step5.execute).not.toHaveBeenCalled();

      // Only steps 1 and 2 should be compensated (not 3, 4, 5)
      expect(step2.compensate).toHaveBeenCalledTimes(1);
      expect(step1.compensate).toHaveBeenCalledTimes(1);
      expect(step3.compensate).not.toHaveBeenCalled();
      expect(step4.compensate).not.toHaveBeenCalled();
      expect(step5.compensate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Saga logging
  // ==========================================================================

  describe('saga log recording', () => {
    it('should record saga log in orchestrator', async () => {
      // Arrange
      const saga = orchestrator.createSaga('LoggedSaga');
      saga.addStep(createStep('step-1'));

      // Act
      await orchestrator.executeSaga(saga, {});

      // Assert
      const logs = orchestrator.getSagaLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].sagaName).toBe('LoggedSaga');
      expect(logs[0].status).toBe(SagaStatus.COMPLETED);
    });

    it('should retrieve specific saga log by ID', async () => {
      // Arrange
      const saga = orchestrator.createSaga('FindableSaga');
      saga.addStep(createStep('step-1'));

      // Act
      const result = await orchestrator.executeSaga(saga, {});
      const log = orchestrator.getSagaLog(result.log.sagaId);

      // Assert
      expect(log).toBeDefined();
      expect(log?.sagaName).toBe('FindableSaga');
    });

    it('should include completedAt timestamp in saga log', async () => {
      // Arrange
      const saga = orchestrator.createSaga('TimedSaga');
      saga.addStep(createStep('step-1'));

      // Act
      const result = await orchestrator.executeSaga(saga, {});

      // Assert
      expect(result.log.completedAt).toBeInstanceOf(Date);
      expect(result.log.startedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Saga class direct usage
  // ==========================================================================

  describe('Saga class', () => {
    it('should track status through lifecycle', async () => {
      // Arrange
      const saga = new Saga('saga-1', 'StatusSaga');
      expect(saga.status).toBe(SagaStatus.PENDING);

      saga.addStep(createStep('step-1'));

      // Act
      await saga.execute({});

      // Assert
      expect(saga.status).toBe(SagaStatus.COMPLETED);
    });

    it('should chain addStep calls fluently', () => {
      // Arrange & Act
      const saga = new Saga('saga-1', 'FluentSaga');
      const result = saga
        .addStep(createStep('a'))
        .addStep(createStep('b'))
        .addStep(createStep('c'));

      // Assert
      expect(result).toBe(saga);
    });
  });
});
