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
