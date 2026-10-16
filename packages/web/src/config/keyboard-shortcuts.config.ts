import { Home, ShoppingCart, Package, Wrench, FileText, Settings, HelpCircle, Command, PanelLeftClose } from 'lucide-react';

export interface ShortcutItem {
  keys: string[];
  description: string;
  action?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const globalShortcuts: ShortcutItem[] = [
  {
    keys: ['⌘', 'K'],
    description: 'Buka command palette',
    icon: Command,
  },
  {
    keys: ['⌘', '/'],
    description: 'Tampilkan semua pintasan',
    icon: HelpCircle,
  },
  {
    keys: ['⌘', 'B'],
    description: 'Tampilkan/sembunyikan sidebar',
    icon: PanelLeftClose,
  },
  {
    keys: ['⌘', 'D'],
    description: 'Buka Dashboard',
    icon: Home,
  },
  {
    keys: ['⌘', 'P'],
    description: 'Buka POS',
    icon: ShoppingCart,
  },
  {
    keys: ['⌘', 'E'],
    description: 'Buka Produk',
    icon: Package,
  },
  {
    keys: ['⌘', 'I'],
    description: 'Buka Inventori',
    icon: Wrench,
  },
  {
    keys: ['⌘', 'R'],
    description: 'Buka Laporan',
    icon: FileText,
  },
  {
    keys: ['⌘', ','],
    description: 'Buka Pengaturan',
    icon: Settings,
  },
];

// Get platform-specific key name (⌘ for Mac, Ctrl for Windows/Linux)
export function getModKey(): '⌘' | 'Ctrl' {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl';
}
