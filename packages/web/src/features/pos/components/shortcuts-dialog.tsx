import { Keyboard, Home, Command } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { POS_SHORTCUTS } from '../hooks/use-pos-shortcuts';
import { globalShortcuts, getModKey } from '@/config/keyboard-shortcuts.config';

interface ShortcutsDialogProps {
    open: boolean;
    onClose: () => void;
    /** Show global shortcuts tab. Defaults to true. */
    showGlobal?: boolean;
    /** Show POS shortcuts tab. Defaults to true. */
    showPOS?: boolean;
    /** Default active tab. */
    defaultTab?: 'global' | 'pos';
}

export function ShortcutsDialog({
    open,
    onClose,
    showGlobal = true,
    showPOS = true,
    defaultTab = 'global',
}: ShortcutsDialogProps) {
    const modKey = getModKey();

    // Helper to render a shortcut row
    const ShortcutRow = ({
        keys,
        description,
        icon: Icon,
    }: {
        keys: string[];
        description: string;
        icon?: React.ComponentType<{ className?: string }>;
    }) => (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{description}</span>
            </div>
            <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                    <kbd
                        key={i}
                        className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md border bg-muted font-mono text-xs font-semibold text-muted-foreground shrink-0"
                    >
                        {key}
                    </kbd>
                ))}
            </div>
        </div>
    );

    const globalShortcutsWithModKey = globalShortcuts.map((s) => ({
        ...s,
        keys: s.keys.map((k) => (k === '⌘' ? modKey : k)),
    }));

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Use keyboard shortcuts to navigate and work faster.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        {showGlobal && <TabsTrigger value="global">Global</TabsTrigger>}
                        {showPOS && <TabsTrigger value="pos">POS</TabsTrigger>}
                    </TabsList>

                    {showGlobal && (
                        <TabsContent value="global" className="mt-4">
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Quick Actions Shortcuts */}
                                <section>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Command className="h-4 w-4" />
                                        Quick Actions
                                    </h3>
                                    <div className="grid grid-cols-1 gap-0.5">
                                        {globalShortcutsWithModKey.slice(0, 3).map((shortcut) => (
                                            <ShortcutRow key={shortcut.description} {...shortcut} />
                                        ))}
                                    </div>
                                </section>

                                <Separator />

                                {/* Navigation Shortcuts */}
                                <section>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Home className="h-4 w-4" />
                                        Navigation
                                    </h3>
                                    <div className="grid grid-cols-1 gap-0.5">
                                        {globalShortcutsWithModKey.slice(3).map((shortcut) => (
                                            <ShortcutRow key={shortcut.description} {...shortcut} />
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </TabsContent>
                    )}

                    {showPOS && (
                        <TabsContent value="pos" className="mt-4">
                            <div className="grid grid-cols-1 gap-0.5 max-h-[60vh] overflow-y-auto">
                                {POS_SHORTCUTS.map((shortcut) => (
                                    <ShortcutRow
                                        key={shortcut.key}
                                        keys={[shortcut.key]}
                                        description={shortcut.description}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
