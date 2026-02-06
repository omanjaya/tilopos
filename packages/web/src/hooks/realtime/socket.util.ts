/**
 * WebSocket Connection Utility
 *
 * Manages shared Socket.io connection with reference counting.
 * Ensures a single WebSocket connection is shared across all hooks.
 */

import { io, type Socket } from 'socket.io-client';

// -------------------------------------------------------------------
// Configuration
// -------------------------------------------------------------------

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin;
const SOCKET_NAMESPACE = '/notifications';

// -------------------------------------------------------------------
// Shared Socket Management
// -------------------------------------------------------------------

let sharedSocket: Socket | null = null;
let refCount = 0;

/**
 * Get the shared Socket.io instance.
 * Creates a new connection if one doesn't exist.
 * Increments reference count.
 */
export function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const token = localStorage.getItem('token');

    sharedSocket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: token ? { token } : undefined,
    });
  }

  refCount++;
  return sharedSocket;
}

/**
 * Release the shared Socket.io instance.
 * Decrements reference count and disconnects when no hooks are using it.
 */
export function releaseSharedSocket(): void {
  refCount--;

  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

/**
 * Get current connection state (for debugging).
 */
export function getSocketState(): { connected: boolean; refCount: number } {
  return {
    connected: sharedSocket?.connected ?? false,
    refCount,
  };
}
