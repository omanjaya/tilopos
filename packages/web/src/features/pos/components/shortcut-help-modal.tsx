import { ShortcutsDialog } from './shortcuts-dialog';

interface ShortcutHelpModalProps {
    open: boolean;
    onClose: () => void;
}

/**
 * Backward-compatible wrapper around ShortcutsDialog.
 */
export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
    return <ShortcutsDialog open={open} onClose={onClose} />;
}
