import { recoverSocketSession } from './socket-session';
/**
 * WebSocket Connection Utility
 *
 * Manages shared Socket.io connection with reference counting.
 * Ensures a single WebSocket connection is shared across all hooks.
 */

import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

// -------------------------------------------------------------------
// Configuration
// -------------------------------------------------------------------

// Use backend URL from env, or default to current origin (nginx proxies /socket.io)
const SOCKET_URL = import.meta.env.VITE_WS_URL ||
                   import.meta.env.VITE_API_URL ||
                   '';
const SOCKET_NAMESPACE = '/notifications';

// -------------------------------------------------------------------
// Shared Socket Management
// -------------------------------------------------------------------

let sharedSocket: Socket | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Room membership is shared by every hook on the same socket, so it is ref-counted:
// the socket only leaves a room when the last consumer releases it.
const roomRefs = new Map<string, { room: ResolvedRoom; count: number }>();

function emitJoin(socket: Socket, room: ResolvedRoom): void {
  socket.emit('joinRoom', { room: room.type, outletId: room.outletId, businessId: room.businessId });
}

export interface ResolvedRoom {
  /** Room type sent to the backend joinRoom handler ('outlet', 'business', 'kds', ...) */
  type: string;
  outletId?: string;
  businessId?: string;
  /** Actual server-side room name (mirrors notifications.gateway.ts handleJoinRoom) */
  name: string;
}

/**
 * Resolve a room request ('outlet', 'outlet:<id>', 'business', 'kds:<id>', ...) to the
 * server-side room name the gateway uses.
 */
export function resolveRoom(
  room: string,
  opts: { outletId?: string | null; businessId?: string | null } = {},
): ResolvedRoom {
  const [rawType, rawId] = room.includes(':') ? room.split(':', 2) : [room, undefined];
  const type = rawType ?? room;
  const businessId = (type === 'business' ? rawId : undefined) ?? opts.businessId ?? undefined;
  const outletId = (type === 'outlet' || type === 'kds' ? rawId : undefined) ?? opts.outletId ?? undefined;
  switch (type) {
    case 'outlet':
      return { type, outletId, businessId, name: `outlet:${outletId}` };
    case 'kds':
      return { type, outletId, businessId, name: `kds:${outletId}` };
    case 'business':
      return { type, businessId, name: `business:${businessId}` };
    default:
      return { type, outletId, businessId, name: `${type}:${businessId}` };
  }
}

/** Join a room (ref-counted). Returns the resolved server-side room name. */
export function acquireRoom(socket: Socket, room: ResolvedRoom): string {
  const entry = roomRefs.get(room.name);
  if (entry) {
    entry.count++;
  } else {
    roomRefs.set(room.name, { room, count: 1 });
    emitJoin(socket, room);
  }
  return room.name;
}

/** Release a room joined with acquireRoom; leaves it when nobody uses it anymore. */
export function releaseRoom(socket: Socket | null, name: string): void {
  const entry = roomRefs.get(name);
  if (!entry) return;
  if (entry.count <= 1) {
    roomRefs.delete(name);
    socket?.emit('leaveRoom', { room: name });
  } else {
    entry.count--;
  }
}

/**
 * Get the shared Socket.io instance.
 * Creates a new connection if one doesn't exist.
 * Increments reference count.
 * Returns null if not authenticated.
 */
export function getSharedSocket(): Socket | null {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  // Cancel pending disconnect (handles React Strict Mode double-mount)
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  if (!sharedSocket) {
    sharedSocket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Use a function so reconnections always use the latest token
      auth: (cb) => {
        cb({ token: useAuthStore.getState().token });
      },
    });
    // Server-side room membership is lost on reconnect: re-join every room still in use
    const socket = sharedSocket;
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') recoverSocketSession(socket, () => sharedSocket === socket);
    });
    socket.on('connect', () => {
      roomRefs.forEach(({ room }) => emitJoin(socket, room));
    });
  }

  refCount++;
  return sharedSocket;
}

/**
 * Release the shared Socket.io instance.
 * Decrements reference count and defers disconnect to handle React Strict Mode remount.
 */
export function releaseSharedSocket(): void {
  refCount--;

  if (refCount <= 0) {
    refCount = 0;
    disconnectTimer = setTimeout(() => {
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        roomRefs.clear();
      }
      disconnectTimer = null;
    }, 100);
  }
}

/**
 * Force disconnect and destroy the shared socket.
 * Call this when the auth token changes (e.g. on logout or re-login)
 * so the next getSharedSocket() creates a fresh connection with the new token.
 */
export function destroySharedSocket(): void {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  refCount = 0;
  roomRefs.clear();
}
