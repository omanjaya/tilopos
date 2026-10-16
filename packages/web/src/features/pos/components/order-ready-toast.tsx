/**
 * OrderReadyToast
 *
 * Listens for `order:status_changed` (ready) WebSocket events and notifies the cashier
 * with a toast notification and an audible alert.
 *
 * Render this component inside the POS page so it stays mounted while
 * the cashier is working.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeOrders } from '@/hooks/use-realtime';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { toast } from '@/lib/toast-utils';

interface OrderReadyEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  occurredOn: string;
  orderNumber?: string;
  tableName?: string;
}

// Reuse a single AudioContext to avoid exceeding browser limits
let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) sharedAudioCtx = new AudioContext();
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {/* ignore */});
  }
  return sharedAudioCtx;
}

/** Play a distinct "order ready" chime via Web Audio API. */
function playOrderReadySound(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Two-tone ascending chime: D5 -> A5
    const notes = [587, 880];
    const durations = [0.15, 0.25];
    let offset = 0;

    for (let i = 0; i < notes.length; i++) {
      const freq = notes[i] ?? 587;
      const dur = durations[i] ?? 0.15;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + offset);
      gain.gain.setValueAtTime(0.3, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + dur);

      osc.start(t + offset);
      osc.stop(t + offset + dur);
      offset += dur * 0.8;
    }
  } catch {
    /* Web Audio not available */
  }
}

export function OrderReadyToast() {
  const { soundEnabled } = useSoundEffects();
  const soundEnabledRef = useRef(soundEnabled);
  const recentRef = useRef(new Map<string, number>());

  // Update ref in effect to avoid accessing ref during render
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const handleOrderStatusChanged = useCallback((event: OrderReadyEvent) => {
    // Only react when the new status signals "ready" (KDS marks order as ready)
    const readyStatuses = ['ready', 'completed', 'ready_for_pickup'];
    if (!readyStatuses.includes(event.newStatus)) return;

    // Two gateways may broadcast the same change: notify once per order
    const now = Date.now();
    const last = recentRef.current.get(event.orderId);
    if (last && now - last < 10_000) return;
    recentRef.current.set(event.orderId, now);
    for (const [id, ts] of recentRef.current) {
      if (now - ts > 60_000) recentRef.current.delete(id);
    }

    // Play notification sound
    if (soundEnabledRef.current) {
      playOrderReadySound();
    }

    // Show toast notification
    const orderLabel = event.orderNumber
      ? `Pesanan #${event.orderNumber}`
      : `Pesanan`;
    const tableInfo = event.tableName ? ` - ${event.tableName}` : '';

    toast.info({
      title: 'Pesanan Siap!',
      description: `${orderLabel}${tableInfo} siap untuk disajikan.`,
    });
  }, []);

  // The backend emits both `order:status_changed` (newStatus=ready) and
  // `order:ready` for the same event, so subscribe to `order:status_changed` only.
  useRealtimeOrders({
    onStatusChanged: handleOrderStatusChanged,
  });

  return null;
}
