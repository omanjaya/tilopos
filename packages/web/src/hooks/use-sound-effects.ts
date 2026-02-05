import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SoundName =
  | 'addToCart'
  | 'removeFromCart'
  | 'paymentSuccess'
  | 'error'
  | 'scanBarcode';

interface UseSoundEffectsReturn {
  /** Play a named sound effect. No-op when sound is disabled. */
  play: (name: SoundName) => void;
  /** Whether sound effects are currently enabled. */
  soundEnabled: boolean;
  /** Toggle the sound enabled/disabled state. Persisted to localStorage. */
  toggleSound: () => void;
}

// ---------------------------------------------------------------------------
// LocalStorage-backed toggle (shared across all hook consumers)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'tilopos-sound-enabled';

function getStoredEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // default: on
    return raw === 'true';
  } catch {
    return true;
  }
}

let cachedEnabled = getStoredEnabled();
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return cachedEnabled;
}

function toggle(): void {
  cachedEnabled = !cachedEnabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(cachedEnabled));
  } catch {
    // quota exceeded -- ignore
  }
  listeners.forEach((cb) => cb());
}

// ---------------------------------------------------------------------------
// AudioContext singleton (lazy, created on first play like the KDS approach)
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      /* ignore */
    });
  }
  return audioCtx;
}

// ---------------------------------------------------------------------------
// Sound generators (all programmatic via OscillatorNode, no audio files)
// ---------------------------------------------------------------------------

function playAddToCart(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Quick bright beep - short sine at 1200 Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.06);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.start(t);
    osc.stop(t + 0.1);
  } catch {
    /* Web Audio not available */
  }
}

function playRemoveFromCart(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Soft descending tone - "undo" feel
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.15);
  } catch {
    /* Web Audio not available */
  }
}

function playPaymentSuccess(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // "Cha-ching" - three ascending tones with a metallic ring
    const notes = [523, 659, 784]; // C5, E5, G5 (major chord ascending)
    const durations = [0.12, 0.12, 0.3];
    let offset = 0;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i] ?? 523;
      const dur = durations[i] ?? 0.12;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(note, t + offset);
      gain.gain.setValueAtTime(0.25, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + dur);

      osc.start(t + offset);
      osc.stop(t + offset + dur);
      offset += dur * 0.7; // slight overlap
    }

    // Add a high metallic "ring" on top
    const ring = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ring.connect(ringGain);
    ringGain.connect(ctx.destination);

    ring.type = 'sine';
    ring.frequency.setValueAtTime(2093, t + 0.15); // C7
    ringGain.gain.setValueAtTime(0.1, t + 0.15);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    ring.start(t + 0.15);
    ring.stop(t + 0.6);
  } catch {
    /* Web Audio not available */
  }
}

function playError(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Error buzzer - low harsh buzz with two pulses
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(200, t + i * 0.2);
      gain.gain.setValueAtTime(0.2, t + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.15);

      osc.start(t + i * 0.2);
      osc.stop(t + i * 0.2 + 0.15);
    }
  } catch {
    /* Web Audio not available */
  }
}

function playScanBarcode(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Scanner beep - sharp high-pitched blip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.08);

    // Second slightly lower blip
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1800, t + 0.1);
    gain2.gain.setValueAtTime(0.12, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc2.start(t + 0.1);
    osc2.stop(t + 0.18);
  } catch {
    /* Web Audio not available */
  }
}

// ---------------------------------------------------------------------------
// Dispatch map
// ---------------------------------------------------------------------------

const SOUND_MAP: Record<SoundName, () => void> = {
  addToCart: playAddToCart,
  removeFromCart: playRemoveFromCart,
  paymentSuccess: playPaymentSuccess,
  error: playError,
  scanBarcode: playScanBarcode,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides POS-specific sound effects generated via the Web Audio API.
 *
 * ```tsx
 * const { play, soundEnabled, toggleSound } = useSoundEffects();
 * play('addToCart');
 * ```
 */
export function useSoundEffects(): UseSoundEffectsReturn {
  const soundEnabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Keep a ref so the `play` callback identity is stable
  const enabledRef = useRef(soundEnabled);

  // Update ref in effect to avoid accessing ref during render
  useEffect(() => {
    enabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    const fn = SOUND_MAP[name];
    if (fn) fn();
  }, []);

  const toggleSound = useCallback(() => {
    toggle();
  }, []);

  return { play, soundEnabled, toggleSound };
}
