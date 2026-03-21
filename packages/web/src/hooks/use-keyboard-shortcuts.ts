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
 * Keyboard shortcuts are disabled.
 * This hook is intentionally a no-op — all global and page-level shortcuts have been removed.
 */
export function useKeyboardShortcuts(_options: UseKeyboardShortcutsOptions): void {
    // No-op: keyboard shortcuts disabled
}
