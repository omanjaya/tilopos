import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, type KeyboardShortcut } from './use-keyboard-shortcuts';
import { getModKey } from '@/config/keyboard-shortcuts.config';

interface OpenCommandPaletteEvent extends CustomEvent {
  detail: { open: boolean };
}

declare global {
  interface WindowEventMap {
    'open-command-palette': OpenCommandPaletteEvent;
  }
}

interface UseGlobalShortcutsOptions {
  /** Enable/disable global shortcuts. Defaults to true. */
  enabled?: boolean;
}

/**
 * Hook for registering global keyboard shortcuts across the application.
 * Provides navigation shortcuts, command palette toggle, and help access.
 *
 * @example
 * ```tsx
 * function App() {
 *   useGlobalShortcuts();
 *   return <div>{/* ... *\/}</div>;
 * }
 * ```
 */
export function useGlobalShortcuts({ enabled = true }: UseGlobalShortcutsOptions = {}): void {
  const navigate = useNavigate();
  const modKey = getModKey();

  const shortcuts: KeyboardShortcut[] = [
    // Command palette - dispatch event for command palette to handle
    {
      key: 'k',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => {
        window.dispatchEvent(new CustomEvent('open-command-palette', { detail: { open: true } }));
      },
    },
    // Show shortcuts - dispatch event for shortcuts dialog
    {
      key: '/',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl', shift: true },
      handler: () => {
        window.dispatchEvent(new CustomEvent('open-shortcuts-dialog', { detail: { open: true } }));
      },
    },
    // Dashboard navigation
    {
      key: 'd',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => navigate('/app'),
    },
    // POS navigation
    {
      key: 'p',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      preventDefault: true, // Prevent Ctrl+P (print)
      handler: () => navigate('/app/pos'),
    },
    // Products navigation
    {
      key: 'e',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => navigate('/app/products'),
    },
    // Inventory navigation
    {
      key: 'i',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => navigate('/app/inventory'),
    },
    // Reports navigation
    {
      key: 'r',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => navigate('/app/reports'),
    },
    // Settings navigation
    {
      key: ',',
      modifiers: { meta: modKey === '⌘', ctrl: modKey === 'Ctrl' },
      handler: () => navigate('/app/settings'),
    },
  ];

  useKeyboardShortcuts({ shortcuts, enabled });

  // First-use hint for command palette
  useEffect(() => {
    if (!enabled) return;

    const hasSeenHint = localStorage.getItem('tilo-shortcut-hint-seen');
    if (!hasSeenHint) {
      // Delay hint to avoid showing immediately on page load
      const timer = setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('toast-info', {
            detail: {
              title: 'Quick Actions',
              message: `Press ${modKey}K to open command palette`,
              duration: 4000,
            },
          })
        );
        localStorage.setItem('tilo-shortcut-hint-seen', 'true');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [enabled, modKey]);
}

/**
 * Hook for keyboard shortcuts specific to a page.
 * Useful for POS, forms, or other feature-specific shortcuts.
 *
 * @example
 * ```tsx
 * function POSPage() {
 *   usePageShortcuts([
 *     { key: 'F1', handler: () => focusSearch() },
 *     { key: 'F12', handler: () => processPayment() },
 *   ]);
 *   return <div>{/* ... *\/}</div>;
 * }
 * ```
 */
export function usePageShortcuts(
  shortcuts: KeyboardShortcut[],
  options?: { enabled?: boolean }
): void {
  useKeyboardShortcuts({
    shortcuts: shortcuts.map((s) => ({
      ...s,
      // Page shortcuts default to preventDefault: true for F-keys
      preventDefault: s.preventDefault ?? true,
      // Page shortcuts default to NOT working in inputs unless specified
      allowInInput: s.allowInInput ?? false,
    })),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook that listens for command palette open/close events.
 * Useful for integrating the command palette with global shortcuts.
 *
 * @example
 * ```tsx
 * function CommandPalette() {
 *   const [open, setOpen] = useState(false);
 *   useCommandPaletteListener((isOpen) => setOpen(isOpen));
 *   return <Dialog open={open}>...</Dialog>;
 * }
 * ```
 */
export function useCommandPaletteListener(callback: (open: boolean) => void): void {
  useEffect(() => {
    const handler = ((e: OpenCommandPaletteEvent) => {
      callback(e.detail.open);
    }) as EventListener;

    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, [callback]);
}

/**
 * Hook that listens for shortcuts dialog open/close events.
 *
 * @example
 * ```tsx
 * function ShortcutsDialog() {
 *   const [open, setOpen] = useState(false);
 *   useShortcutsDialogListener((isOpen) => setOpen(isOpen));
 *   return <Dialog open={open}>...</Dialog>;
 * }
 * ```
 */
export function useShortcutsDialogListener(callback: (open: boolean) => void): void {
  useEffect(() => {
    const handler = ((e: OpenCommandPaletteEvent) => {
      callback(e.detail.open);
    }) as EventListener;

    window.addEventListener('open-shortcuts-dialog', handler);
    return () => window.removeEventListener('open-shortcuts-dialog', handler);
  }, [callback]);
}
