import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { KDSOrder } from '@/types/kds.types';

let audioContextRef: AudioContext | null = null;
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 30000;

let lastNewOrderBeepTime = 0;
const NEW_ORDER_BEEP_COOLDOWN_MS = 5000;

function playAlertBeep() {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;

  try {
    if (!audioContextRef) {
      audioContextRef = new AudioContext();
    }
    const ctx = audioContextRef;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio API not available - silently fail
  }
}

function playNewOrderBeep() {
  const now = Date.now();
  if (now - lastNewOrderBeepTime < NEW_ORDER_BEEP_COOLDOWN_MS) return;
  lastNewOrderBeepTime = now;

  try {
    if (!audioContextRef) {
      audioContextRef = new AudioContext();
    }
    const ctx = audioContextRef;

    // Two-tone ascending beep for new orders
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio API not available - silently fail
  }
}

export function useKdsSound(orders: KDSOrder[]) {
  // Track which orders have already triggered alerts to avoid repeats
  const alertedOrdersRef = useRef<Set<string>>(new Set());
  // Track previous order IDs to detect new arrivals
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // Sound alert for new orders arriving
  useEffect(() => {
    if (orders.length === 0) return;

    const currentIds = new Set(orders.map((o) => o.id));
    const prevIds = previousOrderIdsRef.current;

    // Detect new orders not seen before
    if (prevIds.size > 0) {
      let hasNew = false;
      for (const id of currentIds) {
        if (!prevIds.has(id)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) {
        playNewOrderBeep();
        toast({
          title: 'Pesanan baru!',
          description: 'Pesanan baru telah masuk ke dapur.',
        });
      }
    }

    previousOrderIdsRef.current = currentIds;
  }, [orders]);

  // Sound alert for orders exceeding 10 minutes
  useEffect(() => {
    const hasOverdue = orders.some(
      (o) =>
        o.elapsedMinutes >= 10 &&
        !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served') &&
        !alertedOrdersRef.current.has(o.id),
    );

    if (hasOverdue) {
      playAlertBeep();
      orders.forEach((o) => {
        if (
          o.elapsedMinutes >= 10 &&
          !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served')
        ) {
          alertedOrdersRef.current.add(o.id);
        }
      });
    }
  }, [orders]);
}
