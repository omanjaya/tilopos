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
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { EventBusService } from '../../infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';

// Define standard kitchen stations
export type KitchenStation = 'grill' | 'fryer' | 'cold' | 'hot' | 'drinks' | 'dessert' | 'general';

interface KdsSocket extends Socket {
  userId?: string;
  businessId?: string;
  outletId?: string;
  station?: KitchenStation;
}

// Rate limiting: max requests per window
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

@WebSocketGateway({
  namespace: '/kds',
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' },
})
export class KdsGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KdsGateway.name);
  private readonly userRooms = new Map<string, Set<string>>();
  private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Order status changed events
    this.eventBus.ofType(OrderStatusChangedEvent).subscribe((event) => {
      this.server.to(`outlet:${event.outletId}`).emit('order:status_changed', {
        orderId: event.orderId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        occurredOn: event.occurredOn,
      });

      // Emit order:new when a new order is created (pending status from empty previous)
      if (event.newStatus === 'pending' && !event.previousStatus) {
        this.server.to(`outlet:${event.outletId}`).emit('order:new', {
          orderId: event.orderId,
          outletId: event.outletId,
          createdAt: event.occurredOn.toISOString(),
        });

        this.logger.log(
          `New order event emitted for order ${event.orderId} in outlet ${event.outletId}`,
        );
      }

      // Emit order:ready event to outlet room when order is bumped to "ready"
      if (event.newStatus === 'ready') {
        this.server.to(`outlet:${event.outletId}`).emit('order:ready', {
          orderId: event.orderId,
          outletId: event.outletId,
          previousStatus: event.previousStatus,
          readyAt: event.occurredOn.toISOString(),
        });

        this.logger.log(
          `Order ready event emitted for order ${event.orderId} in outlet ${event.outletId}`,
        );
      }
    });

    this.logger.log(
      'KDS Gateway initialized with multi-station support, order:new and order:ready notifications',
    );
  }

  handleConnection(client: KdsSocket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      this.logger.warn(`KDS client rejected - no token: ${client.id}`);
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token as string);
      client.userId = payload.sub;
      client.businessId = payload.businessId;
      this.logger.debug(`KDS client authenticated: ${client.id} user=${payload.sub}`);
    } catch {
      this.logger.warn(`KDS client rejected - invalid token: ${client.id}`);
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: KdsSocket) {
    // Clean up rooms
    const rooms = this.userRooms.get(client.id);
    if (rooms) {
      for (const room of rooms) {
        client.leave(room);
      }
      this.userRooms.delete(client.id);
    }
    this.rateLimitMap.delete(client.id);
    this.logger.debug(`KDS client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOutlet')
  handleJoinOutlet(
    @MessageBody() data: { outletId: string },
    @ConnectedSocket() client: KdsSocket,
  ) {
    if (!client.businessId) {
      return { error: 'Not authenticated' };
    }

    if (this.isRateLimited(client.id)) {
      return { error: 'Rate limit exceeded. Try again later.' };
    }

    const room = `outlet:${data.outletId}`;
    void client.join(room);
    client.outletId = data.outletId;

    this.trackRoom(client.id, room);
    this.logger.debug(`Client ${client.id} joined outlet: ${data.outletId}`);

    return { event: 'joined', data: { outletId: data.outletId, room } };
  }

  @SubscribeMessage('joinStation')
  handleJoinStation(
    @MessageBody() data: { outletId: string; station: KitchenStation },
    @ConnectedSocket() client: KdsSocket,
  ) {
    if (!client.businessId) {
      return { error: 'Not authenticated' };
    }

    if (this.isRateLimited(client.id)) {
      return { error: 'Rate limit exceeded. Try again later.' };
    }

    const room = `station:${data.outletId}:${data.station}`;
    void client.join(room);
    client.outletId = data.outletId;
    client.station = data.station;

    this.trackRoom(client.id, room);
    this.logger.debug(
      `Client ${client.id} joined station: ${data.station} at outlet ${data.outletId}`,
    );

    return { event: 'joined', data: { outletId: data.outletId, station: data.station, room } };
  }

  @SubscribeMessage('leaveStation')
  handleLeaveStation(
    @MessageBody() data: { outletId: string; station: KitchenStation },
    @ConnectedSocket() client: KdsSocket,
  ) {
    const room = `station:${data.outletId}:${data.station}`;
    void client.leave(room);

    const rooms = this.userRooms.get(client.id);
    if (rooms) {
      rooms.delete(room);
    }

    this.logger.debug(
      `Client ${client.id} left station: ${data.station} at outlet ${data.outletId}`,
    );

    return { event: 'left', data: { outletId: data.outletId, station: data.station, room } };
  }

  /**
   * Emit order item update to a specific station
   */
  emitToStation(
    outletId: string,
    station: KitchenStation,
    event: string,
    data: Record<string, unknown>,
  ) {
    this.server.to(`station:${outletId}:${station}`).emit(event, data);
  }

  /**
   * Emit order item update to all stations in an outlet
   */
  emitToOutlet(outletId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`outlet:${outletId}`).emit(event, data);
  }

  private trackRoom(clientId: string, room: string) {
    if (!this.userRooms.has(clientId)) {
      this.userRooms.set(clientId, new Set());
    }
    this.userRooms.get(clientId)!.add(room);
  }

  private isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(clientId);

    if (!entry || now > entry.resetAt) {
      this.rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId}`);
      return true;
    }

    return false;
  }
}
