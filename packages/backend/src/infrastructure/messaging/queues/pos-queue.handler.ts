import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageConsumerService } from '../message-consumer.service';
import { QUEUES, ROUTING_KEYS } from '../rabbitmq.config';
import type { MessageEnvelope, AmqpMessage } from '../rabbitmq.types';

/**
 * Payload shape for transaction.created events.
 */
interface TransactionCreatedPayload {
  readonly transactionId: string;
  readonly outletId: string;
  readonly grandTotal: number;
  readonly customerId: string | null;
}

/**
 * Payload shape for transaction.voided events.
 */
interface TransactionVoidedPayload {
  readonly transactionId: string;
  readonly outletId: string;
  readonly reason: string;
}

/**
 * Payload shape for payment.received events.
 */
interface PaymentReceivedPayload {
  readonly paymentId: string;
  readonly transactionId: string;
  readonly amount: number;
  readonly method: string;
}

/**
 * Handles POS-related messages from the transactions queue:
 * - transaction.created -> Update analytics, trigger stock deduction, process loyalty
 * - transaction.voided -> Reverse stock changes, reverse loyalty points
 * - payment.received -> Update settlement records
 */
@Injectable()
export class PosQueueHandler implements OnModuleInit {
  private readonly logger = new Logger(PosQueueHandler.name);

  constructor(private readonly consumer: MessageConsumerService) {}

  onModuleInit(): void {
    this.consumer.registerHandler(
      QUEUES.POS_TRANSACTIONS,
      (envelope: MessageEnvelope, rawMessage: AmqpMessage) =>
        this.handle(envelope, rawMessage),
    );
  }

  private async handle(envelope: MessageEnvelope, _rawMessage: AmqpMessage): Promise<void> {
    switch (envelope.eventType) {
      case ROUTING_KEYS.TRANSACTION_CREATED:
        await this.handleTransactionCreated(envelope.payload as unknown as TransactionCreatedPayload);
        break;
      case ROUTING_KEYS.TRANSACTION_VOIDED:
        await this.handleTransactionVoided(envelope.payload as unknown as TransactionVoidedPayload);
        break;
      case ROUTING_KEYS.PAYMENT_RECEIVED:
        await this.handlePaymentReceived(envelope.payload as unknown as PaymentReceivedPayload);
        break;
      default:
        this.logger.warn(`PosQueueHandler: unhandled event type "${envelope.eventType}"`);
    }
  }

  private async handleTransactionCreated(payload: TransactionCreatedPayload): Promise<void> {
    this.logger.log(
      `Processing transaction.created: ${payload.transactionId} ` +
      `(outlet: ${payload.outletId}, total: ${payload.grandTotal})`,
    );

    // Stock deduction and loyalty processing are handled by existing
    // TransactionEventListener via the RxJS bus (event-bridge re-emits).
    // This handler is a placeholder for additional cross-service logic
    // such as analytics aggregation or external service notifications.
    await Promise.resolve();
  }

  private async handleTransactionVoided(payload: TransactionVoidedPayload): Promise<void> {
    this.logger.log(
      `Processing transaction.voided: ${payload.transactionId} ` +
      `(outlet: ${payload.outletId}, reason: ${payload.reason})`,
    );

    // Reverse stock and loyalty are handled by domain-specific listeners.
    // This handler is a placeholder for cross-service void processing.
    await Promise.resolve();
  }

  private async handlePaymentReceived(payload: PaymentReceivedPayload): Promise<void> {
    this.logger.log(
      `Processing payment.received: ${payload.paymentId} ` +
      `(transaction: ${payload.transactionId}, amount: ${payload.amount}, method: ${payload.method})`,
    );

    // Settlement processing is handled by the existing BullMQ settlement queue.
    // This handler is a placeholder for cross-service payment notifications.
    await Promise.resolve();
  }
}
