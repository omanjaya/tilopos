import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    handler: () => void;
    /** If true, the shortcut fires even when an input/textarea is focused. Defaults to false. */
    allowInInput?: boolean;
    /** If true, calls event.preventDefault(). Defaults to true. */
    preventDefault?: boolean;
    /** Required modifier keys */
    modifiers?: {
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        meta?: boolean;
    };
}

interface UseKeyboardShortcutsOptions {
    /** Array of shortcut definitions */
    shortcuts: KeyboardShortcut[];
    /** Master switch to enable/disable all shortcuts. Defaults to true. */
    enabled?: boolean;
}

/**
 * Generic hook for registering keyboard shortcuts.
 *
 * Listens for `keydown` events on `window` and invokes the matching handler.
 * F-keys and Escape are always allowed even when an input element is focused
 * unless `allowInInput` is explicitly set to false.
 */
export function useKeyboardShortcuts({
    shortcuts,
    enabled = true,
}: UseKeyboardShortcutsOptions): void {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            const target = event.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            const isFKey = event.key.startsWith('F') && event.key.length <= 3;
            const isEscape = event.key === 'Escape';

            for (const shortcut of shortcuts) {
                if (shortcut.key !== event.key) continue;

                // Check modifier keys
                if (shortcut.modifiers) {
                    if (shortcut.modifiers.ctrl && !event.ctrlKey) continue;
                    if (shortcut.modifiers.shift && !event.shiftKey) continue;
                    if (shortcut.modifiers.alt && !event.altKey) continue;
                    if (shortcut.modifiers.meta && !event.metaKey) continue;
                }

                // When focused on an input, only allow if explicitly permitted or F-key/Escape
                const allowInInput =
                    shortcut.allowInInput ?? (isFKey || isEscape);
                if (isInput && !allowInInput) continue;

                if (shortcut.preventDefault !== false) {
                    event.preventDefault();
                }

                shortcut.handler();
                return;
            }
        },
        [shortcuts, enabled],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
