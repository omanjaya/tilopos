import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
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
import { useNavVisibility } from '@/components/layout/sidebar/use-nav-visibility';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  keywords?: string[];
}

// Command items configuration (labels match the sidebar, Indonesian UI)
const commandItems: CommandItem[] = [
  // Pages
  { id: 'dashboard', label: 'Dashboard', category: 'pages', icon: Home, path: '/app', keywords: ['beranda', 'home', 'ringkasan'] },
  { id: 'pos', label: 'POS Terminal', category: 'pages', icon: ShoppingCart, path: '/pos', keywords: ['kasir', 'jual', 'cashier'] },
  { id: 'products', label: 'Daftar Produk', category: 'pages', icon: Package, path: '/app/products', keywords: ['produk', 'item', 'kategori'] },
  { id: 'inventory', label: 'Stok', category: 'pages', icon: ClipboardList, path: '/app/inventory/stock', keywords: ['inventori', 'stock'] },
  { id: 'stock-transfers', label: 'Transfer Stok', category: 'pages', icon: Store, path: '/app/inventory/transfers', keywords: ['transfer'] },
  { id: 'suppliers', label: 'Supplier', category: 'pages', icon: Store, path: '/app/inventory/suppliers', keywords: ['pemasok', 'vendor'] },
  { id: 'customers', label: 'Daftar Pelanggan', category: 'pages', icon: Users, path: '/app/customers', keywords: ['pelanggan', 'customer'] },
  { id: 'employees', label: 'Daftar Karyawan', category: 'pages', icon: Users, path: '/app/employees', keywords: ['karyawan', 'staf', 'staff'] },
  { id: 'transactions', label: 'Transaksi', category: 'pages', icon: FileText, path: '/app/transactions', keywords: ['penjualan', 'riwayat'] },
  { id: 'orders', label: 'Pesanan', category: 'pages', icon: ClipboardList, path: '/app/orders', keywords: ['order', 'dine in'] },
  { id: 'tables', label: 'Meja', category: 'pages', icon: Table, path: '/app/tables', keywords: ['denah', 'table'] },
  { id: 'shifts', label: 'Manajemen Shift', category: 'pages', icon: Clock, path: '/app/shifts', keywords: ['shift', 'kasir'] },
  { id: 'reports', label: 'Semua Laporan', category: 'pages', icon: BarChart3, path: '/app/reports', keywords: ['laporan', 'analitik'] },
  { id: 'settings', label: 'Pengaturan', category: 'pages', icon: Settings, path: '/app/settings/business', keywords: ['setting', 'konfigurasi'] },
  { id: 'kds', label: 'Kitchen Display', category: 'pages', icon: Monitor, path: '/kds', keywords: ['dapur', 'kitchen'] },

  // Actions
  { id: 'new-product', label: 'Tambah Produk', category: 'actions', icon: Plus, path: '/app/products/new', keywords: ['produk baru'] },
  { id: 'new-customer', label: 'Tambah Pelanggan', category: 'actions', icon: Plus, path: '/app/customers/new', keywords: ['pelanggan baru'] },
  { id: 'new-employee', label: 'Tambah Karyawan', category: 'actions', icon: Plus, path: '/app/employees/new', keywords: ['karyawan baru'] },
  { id: 'start-pos', label: 'Mulai Transaksi POS', category: 'actions', icon: ShoppingCart, path: '/pos', keywords: ['penjualan baru'] },
  { id: 'view-today-report', label: 'Laporan Penjualan', category: 'actions', icon: BarChart3, path: '/app/reports/sales', keywords: ['penjualan harian'] },

  // Settings
  { id: 'business-settings', label: 'Pengaturan Bisnis', category: 'settings', icon: Settings, path: '/app/settings/business' },
  { id: 'outlets', label: 'Pengaturan Outlet', category: 'settings', icon: Store, path: '/app/settings/outlets' },
  { id: 'tax-settings', label: 'Pengaturan Pajak', category: 'settings', icon: FileText, path: '/app/settings/tax' },
  { id: 'receipt-template', label: 'Template Struk', category: 'settings', icon: FileText, path: '/app/settings/receipt' },
  { id: 'devices', label: 'Perangkat', category: 'settings', icon: Monitor, path: '/app/settings/devices' },
  { id: 'notifications', label: 'Pengaturan Notifikasi', category: 'settings', icon: Bell, path: '/app/settings/notifications' },

  // Help
  { id: 'help-center', label: 'Pusat Bantuan', category: 'help', icon: HelpCircle, path: '/app/help', keywords: ['bantuan', 'help'] },
  { id: 'tutorials', label: 'Video Tutorial', category: 'help', icon: Video, path: '/app/help/tutorials' },
  { id: 'shortcuts', label: 'Pintasan Keyboard', category: 'help', icon: Keyboard, keywords: ['shortcut'] },
];

const CATEGORY_ORDER = ['pages', 'actions', 'settings', 'help'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  recent: 'Terakhir Dibuka',
  pages: 'Halaman',
  actions: 'Aksi',
  settings: 'Pengaturan',
  help: 'Bantuan',
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const openShortcutsDialog = useOpenShortcutsDialog();
  const isVisible = useNavVisibility();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Only offer commands the user can open (ROUTE_ROLES + feature flags)
  const availableCommands = useMemo(
    () => commandItems.filter((item) => !item.path || isVisible(item.path)),
    [isVisible],
  );

  // Recent commands from localStorage (re-read each time the palette opens)
  const recentCommands = useMemo(() => {
    if (!open) return [];
    const ids = getRecentCommands();
    return ids
      .map((id) => availableCommands.find((item) => item.id === id))
      .filter((item): item is CommandItem => !!item);
  }, [open, availableCommands]);

  // Listen for global shortcuts / sidebar search button
  useEffect(() => {
    const handler = ((e: CustomEvent<{ open: boolean }>) => {
      onOpenChange(e.detail.open);
    }) as EventListener;

    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, [onOpenChange]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableCommands;
    return availableCommands.filter((item) => {
      const matchesLabel = item.label.toLowerCase().includes(query);
      const matchesKeywords = item.keywords?.some((keyword) => keyword.toLowerCase().includes(query));
      return matchesLabel || matchesKeywords;
    });
  }, [searchQuery, availableCommands]);

  // Sections in render order; the flat list drives keyboard selection
  const sections = useMemo(() => {
    const result: { category: string; commands: CommandItem[] }[] = [];
    if (!searchQuery && recentCommands.length > 0) {
      result.push({ category: 'recent', commands: recentCommands });
    }
    for (const category of CATEGORY_ORDER) {
      const commands = filteredCommands.filter((c) => c.category === category);
      if (commands.length > 0) result.push({ category, commands });
    }
    return result;
  }, [filteredCommands, recentCommands, searchQuery]);

  const flatCommands = useMemo(() => sections.flatMap((s) => s.commands), [sections]);

  // Command selection handler
  const handleSelectCommand = useCallback((command: CommandItem) => {
    addRecentCommand(command.id);

    if (command.id === 'shortcuts') {
      openShortcutsDialog();
      onOpenChange(false);
      return;
    }

    if (command.action) {
      command.action();
    } else if (command.path) {
      navigate(command.path);
    }

    onOpenChange(false);
  }, [navigate, openShortcutsDialog, onOpenChange]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keep selection in range when the list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      const count = flatCommands.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (count > 0) setSelectedIndex((prev) => (prev + 1) % count);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (count > 0) setSelectedIndex((prev) => (prev - 1 + count) % count);
          break;
        case 'Enter': {
          e.preventDefault();
          const selected = flatCommands[selectedIndex];
          if (selected) handleSelectCommand(selected);
          break;
        }
        case 'Escape':
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, flatCommands, handleSelectCommand, onOpenChange]);

  const optionId = (index: number) => `command-option-${index}`;
  let runningIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Palet Perintah</DialogTitle>
        <DialogDescription className="sr-only">Cari dan jalankan perintah</DialogDescription>
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            <Input
              placeholder="Ketik perintah atau cari halaman..."
              aria-label="Cari perintah"
              role="combobox"
              aria-expanded={true}
              aria-controls="command-palette-list"
              aria-activedescendant={flatCommands.length > 0 ? optionId(selectedIndex) : undefined}
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
            <div className="p-2" id="command-palette-list" role="listbox" aria-label="Daftar perintah">
              {sections.map(({ category, commands }) => (
                <div key={category} className="mb-4" role="group" aria-label={CATEGORY_LABELS[category] ?? category}>
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground" aria-hidden="true">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                  {commands.map((command) => {
                    const index = runningIndex++;
                    const selected = index === selectedIndex;
                    return (
                      <button
                        key={`${category}-${command.id}`}
                        id={optionId(index)}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleSelectCommand(command)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-left hover:bg-accent transition-colors',
                          selected && 'bg-accent',
                        )}
                      >
                        <command.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{command.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Empty State */}
              {flatCommands.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
                  <p>Tidak ada hasil</p>
                  <p className="mt-1 text-xs">Coba kata kunci lain, misalnya &quot;bantuan&quot;</p>
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
                <span>navigasi</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
                  <span>↵</span>
                </kbd>
                <span>pilih</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono">
                <span>ESC</span>
              </kbd>
              <span>tutup</span>
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
