import { Keyboard } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { POS_SHORTCUTS } from '../hooks/use-pos-shortcuts';

interface ShortcutsDialogProps {
    open: boolean;
    onClose: () => void;
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Pintasan Keyboard
                    </DialogTitle>
                    <DialogDescription>
                        Gunakan pintasan keyboard untuk mempercepat operasi POS.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-0.5 max-h-[60vh] overflow-y-auto">
                    {POS_SHORTCUTS.map((shortcut) => (
                        <div
                            key={shortcut.key}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <span className="text-sm text-muted-foreground">
                                {shortcut.description}
                            </span>
                            <kbd className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md border bg-muted font-mono text-xs font-semibold text-muted-foreground shrink-0 ml-4">
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
