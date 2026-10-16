import { watchSocketSession } from '@infrastructure/auth/socket-session';
import { assertSessionActive } from '@infrastructure/auth/session-access';
import { AccessTokenPayload, toAuthUser } from '@infrastructure/auth/access-token';
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
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OrderStatusChangedEvent } from '../../domain/events/order-status-changed.event';

// Define standard kitchen stations
export type KitchenStation = 'grill' | 'fryer' | 'cold' | 'hot' | 'drinks' | 'dessert' | 'general';

interface KdsSocket extends Socket {
  userId?: string;
  businessId?: string;
  outletId?: string;
  station?: KitchenStation;
}

const OUTLET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KITCHEN_STATIONS: readonly KitchenStation[] = [
  'grill',
  'fryer',
  'cold',
  'hot',
  'drinks',
  'dessert',
  'general',
];

/**
 * Allowed socket origins: CORS_ORIGIN split on commas (validated at boot, required
 * in production by env.validation.ts); the Vite dev server only outside production.
 */
function socketCorsOrigins(): string[] {
  const configured = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173'];
}

function isValidOutletId(value: unknown): value is string {
  return typeof value === 'string' && OUTLET_ID_PATTERN.test(value);
}

function isKitchenStation(value: unknown): value is KitchenStation {
  return typeof value === 'string' && (KITCHEN_STATIONS as readonly string[]).includes(value);
}

// Rate limiting: max requests per window
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Scaling note: without a Socket.IO Redis adapter, events emitted on one API
 * replica only reach sockets connected to that replica, and the rate-limit map
 * is per process. Run a single replica for sockets (sticky sessions) until the
 * adapter is configured.
 */
@WebSocketGateway({
  namespace: '/kds',
  cors: { origin: socketCorsOrigins() },
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
    private readonly prisma: PrismaService,
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

      // order:new when an order is created (previous status empty, or 'none' from older publishers)
      if (
        event.newStatus === 'pending' &&
        (!event.previousStatus || event.previousStatus === 'none')
      ) {
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

  async handleConnection(client: KdsSocket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      this.logger.warn(`KDS client rejected - no token: ${client.id}`);
      client.disconnect();
      return;
    }
    try {
      const claims = this.jwtService.verify<AccessTokenPayload>(token as string);
      await assertSessionActive(this.prisma, claims);
      const payload = toAuthUser(claims);
      watchSocketSession(this.prisma, claims, client);
      client.userId = payload.employeeId;
      client.businessId = payload.businessId;
      this.logger.debug(`KDS client authenticated: ${client.id} user=${payload.employeeId}`);
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
  async handleJoinOutlet(
    @MessageBody() data: { outletId: string },
    @ConnectedSocket() client: KdsSocket,
  ) {
    if (!client.businessId) {
      return { error: 'Not authenticated' };
    }

    if (this.isRateLimited(client.id)) {
      return { error: 'Rate limit exceeded. Try again later.' };
    }

    if (!isValidOutletId(data?.outletId)) {
      return { error: 'A valid outletId is required' };
    }

    // Validate outlet belongs to user's business
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: data.outletId, businessId: client.businessId },
    });
    if (!outlet) {
      return { error: 'Access denied to this outlet' };
    }

    const room = `outlet:${data.outletId}`;
    void client.join(room);
    client.outletId = data.outletId;

    this.trackRoom(client.id, room);
    this.logger.debug(`Client ${client.id} joined outlet: ${data.outletId}`);

    return { event: 'joined', data: { outletId: data.outletId, room } };
  }

  @SubscribeMessage('joinStation')
  async handleJoinStation(
    @MessageBody() data: { outletId: string; station: KitchenStation },
    @ConnectedSocket() client: KdsSocket,
  ) {
    if (!client.businessId) {
      return { error: 'Not authenticated' };
    }

    if (this.isRateLimited(client.id)) {
      return { error: 'Rate limit exceeded. Try again later.' };
    }

    if (!isValidOutletId(data?.outletId) || !isKitchenStation(data?.station)) {
      return { error: 'A valid outletId and station are required' };
    }

    // Validate outlet belongs to user's business
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: data.outletId, businessId: client.businessId },
    });
    if (!outlet) {
      return { error: 'Access denied to this outlet' };
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
    if (!isValidOutletId(data?.outletId) || !isKitchenStation(data?.station)) {
      return { error: 'A valid outletId and station are required' };
    }
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
