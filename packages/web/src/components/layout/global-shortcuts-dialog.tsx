import { useState, useEffect } from 'react';
import { ShortcutsDialog } from '@/features/pos/components/shortcuts-dialog';

interface OpenShortcutsDialogEvent extends CustomEvent {
  detail: { open: boolean };
}

declare global {
  interface WindowEventMap {
    'open-shortcuts-dialog': OpenShortcutsDialogEvent;
  }
}

/**
 * Global shortcuts dialog that can be triggered from anywhere via custom event.
 *
 * To open programmatically:
 * ```ts
 * window.dispatchEvent(new CustomEvent('open-shortcuts-dialog', { detail: { open: true } }));
 * ```
 *
 * Keyboard shortcut: Cmd+/ or Ctrl+/ (when enabled in useGlobalShortcuts)
 */
export function GlobalShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = ((e: OpenShortcutsDialogEvent) => {
      setOpen(e.detail.open);
    }) as EventListener;

    window.addEventListener('open-shortcuts-dialog', handler);
    return () => window.removeEventListener('open-shortcuts-dialog', handler);
  }, []);

  return (
    <ShortcutsDialog
      open={open}
      onClose={() => setOpen(false)}
      showGlobal={true}
      showPOS={false}
      defaultTab="global"
    />
  );
}

/**
 * Hook to open the global shortcuts dialog.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const openShortcuts = useOpenShortcutsDialog();
 *   return <button onClick={openShortcuts}>Keyboard Shortcuts</button>;
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOpenShortcutsDialog() {
  return () => {
    window.dispatchEvent(
      new CustomEvent('open-shortcuts-dialog', { detail: { open: true } })
    );
  };
}
