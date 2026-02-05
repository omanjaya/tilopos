/**
 * OrderReadyToast
 *
 * Listens for `order:ready` WebSocket events and notifies the cashier
 * with a toast notification and an audible alert.
 *
 * Render this component inside the POS page so it stays mounted while
 * the cashier is working.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeOrders } from '@/hooks/use-realtime';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { toast } from '@/hooks/use-toast';

interface OrderReadyEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  occurredOn: string;
  orderNumber?: string;
  tableName?: string;
}

/** Play a distinct "order ready" chime via Web Audio API. */
function playOrderReadySound(): void {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {/* ignore */});
    }
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

  // Update ref in effect to avoid accessing ref during render
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const handleOrderStatusChanged = useCallback((event: OrderReadyEvent) => {
    // Only react when the new status signals "ready" (KDS marks order as ready)
    const readyStatuses = ['ready', 'completed', 'ready_for_pickup'];
    if (!readyStatuses.includes(event.newStatus)) return;

    // Play notification sound
    if (soundEnabledRef.current) {
      playOrderReadySound();
    }

    // Show toast notification
    const orderLabel = event.orderNumber
      ? `Pesanan #${event.orderNumber}`
      : `Pesanan`;
    const tableInfo = event.tableName ? ` - ${event.tableName}` : '';

    toast({
      title: 'Pesanan Siap!',
      description: `${orderLabel}${tableInfo} siap untuk disajikan.`,
    });
  }, []);

  useRealtimeOrders({
    onStatusChanged: handleOrderStatusChanged,
  });

  // Also listen for the explicit `order:ready` event (some KDS implementations
  // emit a dedicated event in addition to `order:status_changed`).
  useEffect(() => {
    // The useRealtimeOrders hook already establishes the socket connection
    // and joins the outlet room. The `order:status_changed` handler above
    // will catch ready transitions. This component has no visible UI.
  }, []);

  return null;
}
