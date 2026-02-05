import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Store,
  ClipboardList,
  Table,
  Clock,
  Plus,
  Search,
  Keyboard,
  Bell,
  Monitor,
  Video,
} from 'lucide-react';
import { getRecentCommands, addRecentCommand } from '@/config/commands.config';
import { useOpenShortcutsDialog } from '@/components/layout/global-shortcuts-dialog';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  path?: string;
  action?: () => void;
  keywords?: string[];
}

// Command items configuration
const commandItems: CommandItem[] = [
  // Pages
  { id: 'dashboard', label: 'Dashboard', category: 'pages', icon: Home, path: '/app', keywords: ['home', 'overview'] },
  { id: 'pos', label: 'POS Terminal', category: 'pages', icon: ShoppingCart, path: '/pos', keywords: ['cashier', 'sale'] },
  { id: 'products', label: 'Products', category: 'pages', icon: Package, path: '/app/products', keywords: ['inventory', 'items'] },
  { id: 'categories', label: 'Categories', category: 'pages', icon: FileText, path: '/app/products', keywords: ['product categories'] },
  { id: 'inventory', label: 'Inventory', category: 'pages', icon: ClipboardList, path: '/app/inventory/stock', keywords: ['stock'] },
  { id: 'stock-transfers', label: 'Stock Transfers', category: 'pages', icon: Store, path: '/app/inventory/transfers', keywords: ['transfer'] },
  { id: 'suppliers', label: 'Suppliers', category: 'pages', icon: Store, path: '/app/inventory/suppliers', keywords: ['vendor'] },
  { id: 'customers', label: 'Customers', category: 'pages', icon: Users, path: '/app/customers', keywords: ['client'] },
  { id: 'employees', label: 'Employees', category: 'pages', icon: Users, path: '/app/employees', keywords: ['staff', 'team'] },
  { id: 'transactions', label: 'Transactions', category: 'pages', icon: FileText, path: '/app/transactions', keywords: ['sales', 'history'] },
  { id: 'orders', label: 'Orders', category: 'pages', icon: ClipboardList, path: '/app/orders', keywords: ['dine in', 'dinein'] },
  { id: 'tables', label: 'Tables', category: 'pages', icon: Table, path: '/app/tables', keywords: ['layout'] },
  { id: 'shifts', label: 'Shifts', category: 'pages', icon: Clock, path: '/app/shifts', keywords: ['kasir', 'cashier shift'] },
  { id: 'reports', label: 'Reports', category: 'pages', icon: BarChart3, path: '/app/reports', keywords: ['analytics', 'stats'] },
  { id: 'settings', label: 'Settings', category: 'pages', icon: Settings, path: '/app/settings/business', keywords: ['config'] },
  { id: 'kds', label: 'Kitchen Display', category: 'pages', icon: Monitor, path: '/kds', keywords: ['kitchen', 'cooking'] },

  // Actions
  { id: 'new-product', label: 'Create New Product', category: 'actions', icon: Plus, path: '/app/products/new', keywords: ['add product'] },
  { id: 'new-customer', label: 'Add Customer', category: 'actions', icon: Plus, path: '/app/customers/new', keywords: ['new customer'] },
  { id: 'new-employee', label: 'Add Employee', category: 'actions', icon: Plus, path: '/app/employees/new', keywords: ['new staff'] },
  { id: 'start-pos', label: 'Start POS Transaction', category: 'actions', icon: ShoppingCart, path: '/pos', keywords: ['new sale'] },
  { id: 'view-today-report', label: "Today's Sales Report", category: 'actions', icon: BarChart3, path: '/app/reports', keywords: ['daily sales'] },

  // Settings
  { id: 'business-settings', label: 'Business Settings', category: 'settings', icon: Settings, path: '/app/settings/business' },
  { id: 'outlets', label: 'Outlet Settings', category: 'settings', icon: Store, path: '/app/settings/outlets' },
  { id: 'tax-settings', label: 'Tax Settings', category: 'settings', icon: FileText, path: '/app/settings/tax' },
  { id: 'receipt-template', label: 'Receipt Template', category: 'settings', icon: FileText, path: '/app/settings/receipt' },
  { id: 'devices', label: 'Device Settings', category: 'settings', icon: Monitor, path: '/app/settings/devices' },
  { id: 'notifications', label: 'Notification Settings', category: 'settings', icon: Bell, path: '/app/settings/notifications' },

  // Help
  { id: 'help-center', label: 'Help Center', category: 'help', icon: HelpCircle, path: '/app/help' },
  { id: 'tutorials', label: 'Video Tutorials', category: 'help', icon: Video, path: '/app/help/tutorials' },
  { id: 'shortcuts', label: 'View Keyboard Shortcuts', category: 'help', icon: Keyboard, keywords: ['shortcuts'] },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const openShortcutsDialog = useOpenShortcutsDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get recent commands from localStorage
  const recentCommandIds = useMemo(() => getRecentCommands(), []);
  const recentCommands = useMemo(
    () => commandItems.filter(item => recentCommandIds.includes(item.id)),
    [recentCommandIds]
  );

  // Listen for global shortcuts event
  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      onOpenChange(e.detail.open);
    }) as EventListener;

    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, [onOpenChange]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commandItems;
    }

    const query = searchQuery.toLowerCase();
    return commandItems.filter(item => {
      const matchesLabel = item.label.toLowerCase().includes(query);
      const matchesKeywords = item.keywords?.some(keyword =>
        keyword.toLowerCase().includes(query)
      );
      return matchesLabel || matchesKeywords;
    });
  }, [searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = {
      recent: recentCommands,
      pages: [] as CommandItem[],
      actions: [] as CommandItem[],
      settings: [] as CommandItem[],
      help: [] as CommandItem[],
    };

    filteredCommands.forEach(command => {
      if (command.category === 'pages') groups.pages.push(command);
      else if (command.category === 'actions') groups.actions.push(command);
      else if (command.category === 'settings') groups.settings.push(command);
      else if (command.category === 'help') groups.help.push(command);
    });

    return groups;
  }, [filteredCommands, recentCommands]);

  // Command selection handler
  const handleSelectCommand = useCallback((command: CommandItem) => {
    // Add to recent commands
    addRecentCommand(command.id);

    // Special handling for keyboard shortcuts command
    if (command.id === 'shortcuts') {
      openShortcutsDialog();
      onOpenChange(false);
      return;
    }

    // Execute action or navigate
    if (command.action) {
      command.action();
    } else if (command.path) {
      if (command.path.startsWith('#')) {
        // Handle anchor links
        document.querySelector(command.path)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(command.path);
      }
    }

    onOpenChange(false);
  }, [navigate, openShortcutsDialog, onOpenChange]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      const flatCommands = searchQuery
        ? filteredCommands
        : [
            ...recentCommands,
            ...(groupedCommands.pages ?? []),
            ...(groupedCommands.actions ?? []),
            ...(groupedCommands.settings ?? []),
            ...(groupedCommands.help ?? []),
          ];

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % flatCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length);
          break;
        case 'Enter': {
          e.preventDefault();
          const selected = flatCommands[selectedIndex];
          if (selected) {
            handleSelectCommand(selected);
          }
          break;
        }
        case 'Escape':
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredCommands, recentCommands, groupedCommands, searchQuery, handleSelectCommand, onOpenChange]);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      recent: 'Recent',
      pages: 'Pages',
      actions: 'Actions',
      settings: 'Settings',
      help: 'Help',
    };
    return labels[category] || category;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Type a command or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-12 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            <kbd className="pointer-events-none ml-2 flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>

          {/* Command List */}
          <ScrollArea className="max-h-[400px]">
            <div className="p-2">
              {!searchQuery && recentCommands.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Recent
                  </p>
                  {recentCommands.map((command, idx) => (
                    <button
                      key={command.id}
                      onClick={() => handleSelectCommand(command)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-accent',
                        selectedIndex === idx && 'bg-accent'
                      )}
                    >
                      <command.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{command.label}</span>
                      {command.shortcut && (
                        <kbd className="pointer-events-none ml-auto flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Grouped Commands */}
              {Object.entries(groupedCommands).map(([category, commands]) =>
                commands.length > 0 && category !== 'recent' ? (
                  <div key={category} className="mb-4">
                    <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                      {getCategoryLabel(category)}
                    </p>
                    {commands.map((command) => (
                      <button
                        key={command.id}
                        onClick={() => handleSelectCommand(command)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-accent transition-colors"
                      >
                        <command.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{command.label}</span>
                        {command.shortcut && (
                          <kbd className="pointer-events-none ml-auto flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            {command.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null
              )}

              {/* Empty State */}
              {filteredCommands.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No results found</p>
                  <p className="mt-1 text-xs">Try "help" for assistance</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
                  <span>↑↓</span>
                </kbd>
                <span>to navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
                  <span>↵</span>
                </kbd>
                <span>to select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
                <span>ESC</span>
              </kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use command palette
// Note: The ⌘K/Ctrl+K shortcut is now handled by useGlobalShortcuts hook
// This hook is for manual control of the command palette
// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  return { open, setOpen };
}
