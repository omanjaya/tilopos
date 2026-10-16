import { useEffect, useRef } from 'react';

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

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function matches(shortcut: KeyboardShortcut, event: KeyboardEvent): boolean {
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
    const m = shortcut.modifiers ?? {};
    return (
        !!m.ctrl === event.ctrlKey &&
        !!m.meta === event.metaKey &&
        !!m.alt === event.altKey &&
        // Shift is only checked when requested (e.g. '/' and '?' need shift on some layouts)
        (m.shift === undefined || m.shift === event.shiftKey)
    );
}

/**
 * Register keyboard shortcuts on window (keydown). The latest `shortcuts` array is
 * always used, so callers do not need to memoize it.
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions): void {
    const shortcutsRef = useRef(shortcuts);
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.isComposing) return;
            const inInput = isEditableTarget(event.target);
            for (const shortcut of shortcutsRef.current) {
                if (!matches(shortcut, event)) continue;
                // Escape keeps its native meaning inside inputs unless allowed
                if (inInput && !(shortcut.allowInInput ?? /^F\d{1,2}$/.test(shortcut.key))) continue;
                if (shortcut.preventDefault ?? true) event.preventDefault();
                shortcut.handler();
                return;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [enabled]);
}
