import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleInit, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Domain Events
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';
import { TransactionCreatedEvent } from '../../domain/events/transaction-created.event';
import { StockLevelChangedEvent } from '../../domain/events/stock-level-changed.event';
import { StockTransferStatusChangedEvent } from '../../domain/events/stock-transfer-status-changed.event';
import { ShiftStartedEvent } from '../../domain/events/shift-started.event';
import { ShiftEndedEvent } from '../../domain/events/shift-ended.event';
import { DeviceSyncStatusEvent } from '../../domain/events/device-sync-status.event';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  businessId?: string;
  outletId?: string;
  role?: string;
}

interface JoinRoomData {
  room: string;
  businessId?: string;
  outletId?: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userRooms = new Map<string, Set<string>>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Order events
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('order:status_changed', {
        orderId: event.orderId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        occurredOn: event.occurredOn,
      });
    });

    // Transaction events
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      // Emit to the specific outlet
      this.server.to(`outlet:${event.outletId}`).emit('transaction:created', {
        transactionId: event.transactionId,
        outletId: event.outletId,
        amount: event.grandTotal,
        customerId: event.customerId,
        occurredOn: event.occurredOn,
      });

      // Emit shift:sales_updated for active shift banner
      void this.emitShiftSalesUpdate(event.transactionId, event.outletId);
    });

    // Stock level events — emit to outlet when stock levels change
    this.eventBus.ofType(StockLevelChangedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('inventory:stock_changed', {
        outletId: event.outletId,
        productId: event.productId,
        variantId: event.variantId,
        previousQuantity: event.previousQuantity,
        newQuantity: event.newQuantity,
        occurredOn: event.occurredOn,
      });

      // Emit inventory:stock-updated for inventory screens (kebab-case alias)
      this.server.to(`outlet:${event.outletId}`).emit('inventory:stock-updated', {
        outletId: event.outletId,
        productId: event.productId,
        variantId: event.variantId,
        previousQuantity: event.previousQuantity,
        newQuantity: event.newQuantity,
        occurredOn: event.occurredOn,
      });

      // Also emit the underscore variant for legacy listeners
      this.server.to(`outlet:${event.outletId}`).emit('inventory:stock_updated', {
        outletId: event.outletId,
        productId: event.productId,
        variantId: event.variantId,
        quantity: event.newQuantity,
        occurredOn: event.occurredOn,
      });
    });

    // Stock transfer status change — notify both source and destination outlets
    this.eventBus.ofType(StockTransferStatusChangedEvent).subscribe((event) => {
      const payload = {
        transferId: event.transferId,
        sourceOutletId: event.sourceOutletId,
        destinationOutletId: event.destinationOutletId,
        businessId: event.businessId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        updatedBy: event.updatedBy,
        occurredOn: event.occurredOn,
      };

      // Notify source outlet
      this.server.to(`outlet:${event.sourceOutletId}`).emit('transfer:status_changed', payload);

      // Notify destination outlet (if different) — outlet B gets notified when outlet A ships
      if (event.destinationOutletId !== event.sourceOutletId) {
        this.server
          .to(`outlet:${event.destinationOutletId}`)
          .emit('transfer:status_changed', payload);
      }

      // Also notify at business level
      this.server.to(`business:${event.businessId}`).emit('transfer:status_changed', payload);

      // Emit inventory:transfer-status-changed (kebab-case) for inventory screens
      this.server
        .to(`outlet:${event.sourceOutletId}`)
        .emit('inventory:transfer-status-changed', payload);
      if (event.destinationOutletId !== event.sourceOutletId) {
        this.server
          .to(`outlet:${event.destinationOutletId}`)
          .emit('inventory:transfer-status-changed', payload);
      }
      this.server
        .to(`business:${event.businessId}`)
        .emit('inventory:transfer-status-changed', payload);
    });

    // Shift events
    this.eventBus.ofType(ShiftStartedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('shift:started', {
        shiftId: event.shiftId,
        employeeId: event.employeeId,
        employeeName: event.employeeName,
        outletId: event.outletId,
        occurredOn: event.occurredOn,
      });
    });

    this.eventBus.ofType(ShiftEndedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('shift:ended', {
        shiftId: event.shiftId,
        employeeId: event.employeeId,
        employeeName: event.employeeName,
        outletId: event.outletId,
        totalSales: event.totalSales,
        cashCollected: event.cashCollected,
        occurredOn: event.occurredOn,
      });
    });

    // Device sync status events
    this.eventBus.ofType(DeviceSyncStatusEvent).subscribe((event) => {
      const payload = {
        deviceId: event.deviceId,
        deviceName: event.deviceName,
        outletId: event.outletId,
        businessId: event.businessId,
        status: event.status,
        lastSyncTime: event.lastSyncTime?.toISOString() ?? null,
        errorMessage: event.errorMessage ?? null,
        occurredOn: event.occurredOn,
      };

      this.server.to(`outlet:${event.outletId}`).emit('device:sync-status', payload);
      this.server.to(`business:${event.businessId}`).emit('device:sync-status', payload);
    });

    this.logger.log('Subscribed to domain events for real-time notifications');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Remove user from all rooms
    const rooms = this.userRooms.get(client.id);
    if (rooms) {
      for (const room of rooms) {
        client.leave(room);
      }
      this.userRooms.delete(client.id);
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { room, businessId, outletId } = data;

    // Store user context
    if (businessId) client.businessId = businessId;
    if (outletId) client.outletId = outletId;

    // Build room name with context
    let roomName = room;

    switch (room) {
      case 'outlet':
        roomName = `outlet:${outletId}`;
        break;
      case 'business':
        roomName = `business:${businessId}`;
        break;
      case 'kds':
        roomName = `kds:${outletId}`;
        break;
      default:
        roomName = `${room}:${businessId || 'global'}`;
    }

    await client.join(roomName);

    // Track room membership
    if (!this.userRooms.has(client.id)) {
      this.userRooms.set(client.id, new Set());
    }
    this.userRooms.get(client.id)!.add(roomName);

    this.logger.debug(`Client ${client.id} joined room: ${roomName}`);
    return { event: 'joined', data: { room: roomName } };
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    await client.leave(data.room);

    // Remove from tracking
    const rooms = this.userRooms.get(client.id);
    if (rooms) {
      rooms.delete(data.room);
    }

    this.logger.debug(`Client ${client.id} left room: ${data.room}`);
    return { event: 'left', data: { room: data.room } };
  }

  // --- Queue events for waiting list ---

  emitQueueCustomerAdded(
    outletId: string,
    data: {
      customerId: string;
      customerName: string;
      partySize: number;
      position: number;
      estimatedWaitMinutes: number;
    },
  ) {
    this.server.to(`outlet:${outletId}`).emit('queue:customer_added', {
      outletId,
      ...data,
      occurredOn: new Date(),
    });
  }

  emitQueueCustomerCalled(
    outletId: string,
    data: {
      customerId: string;
      customerName: string;
      tableId: string;
      tableName: string;
    },
  ) {
    this.server.to(`outlet:${outletId}`).emit('queue:customer_called', {
      outletId,
      ...data,
      occurredOn: new Date(),
    });
  }

  emitQueueCustomerSeated(
    outletId: string,
    data: {
      customerId: string;
      customerName: string;
      tableId: string;
      tableName: string;
    },
  ) {
    this.server.to(`outlet:${outletId}`).emit('queue:customer_seated', {
      outletId,
      ...data,
      occurredOn: new Date(),
    });
  }

  // Helper method to send notification to specific user
  sendToUser(userId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Helper method to send notification to outlet
  sendToOutlet(outletId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`outlet:${outletId}`).emit(event, data);
  }

  // Helper method to send notification to business
  sendToBusiness(businessId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`business:${businessId}`).emit(event, data);
  }

  // Helper method to broadcast to all
  broadcast(event: string, data: Record<string, unknown>) {
    this.server.emit(event, data);
  }

  /**
   * Look up the active shift for a transaction's employee and emit shift:sales_updated.
   */
  private async emitShiftSalesUpdate(transactionId: string, outletId: string) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { employeeId: true, grandTotal: true },
      });
      if (!transaction || !transaction.employeeId) return;

      const activeShift = await this.prisma.shift.findFirst({
        where: { employeeId: transaction.employeeId, status: 'open' },
        select: { id: true },
      });
      if (!activeShift) return;

      // Aggregate shift totals
      const aggregate = await this.prisma.transaction.aggregate({
        where: { shiftId: activeShift.id, status: { not: 'voided' } },
        _sum: { grandTotal: true },
        _count: true,
      });

      this.server.to(`outlet:${outletId}`).emit('shift:sales_updated', {
        shiftId: activeShift.id,
        totalSales: Number(aggregate._sum?.grandTotal ?? 0),
        totalTransactions: aggregate._count,
        occurredOn: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to emit shift:sales_updated', error);
    }
  }

  /**
   * Emit a new notification to a specific user or outlet.
   * Frontend listens on 'notification:new'.
   */
  emitNotification(
    target: { userId?: string; outletId?: string; businessId?: string },
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      data?: Record<string, unknown>;
    },
  ) {
    if (target.userId) {
      this.server.to(`user:${target.userId}`).emit('notification:new', notification);
    }
    if (target.outletId) {
      this.server.to(`outlet:${target.outletId}`).emit('notification:new', notification);
    }
    if (target.businessId) {
      this.server.to(`business:${target.businessId}`).emit('notification:new', notification);
    }
  }
}
