import { Home, ShoppingCart, Package, Wrench, FileText, Settings, HelpCircle, Command } from 'lucide-react';

export interface ShortcutItem {
  keys: string[];
  description: string;
  action?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const globalShortcuts: ShortcutItem[] = [
  {
    keys: ['⌘', 'K'],
    description: 'Open command palette',
    icon: Command,
  },
  {
    keys: ['⌘', '/'],
    description: 'Show all shortcuts',
    icon: HelpCircle,
  },
  {
    keys: ['⌘', 'D'],
    description: 'Go to Dashboard',
    icon: Home,
  },
  {
    keys: ['⌘', 'P'],
    description: 'Go to POS',
    icon: ShoppingCart,
  },
  {
    keys: ['⌘', 'E'],
    description: 'Go to Products',
    icon: Package,
  },
  {
    keys: ['⌘', 'I'],
    description: 'Go to Inventory',
    icon: Wrench,
  },
  {
    keys: ['⌘', 'R'],
    description: 'Go to Reports',
    icon: FileText,
  },
  {
    keys: ['⌘', ','],
    description: 'Open Settings',
    icon: Settings,
  },
];

export const posShortcuts: ShortcutItem[] = [
  { keys: ['F1'], description: 'Focus search products' },
  { keys: ['F2'], description: 'Toggle grid/list view' },
  { keys: ['F3'], description: 'Show categories' },
  { keys: ['F4'], description: 'View cart' },
  { keys: ['F5'], description: 'Hold bill' },
  { keys: ['F6'], description: 'Resume bill' },
  { keys: ['F7'], description: 'Apply discount' },
  { keys: ['F8'], description: 'Add note' },
  { keys: ['F9'], description: 'Quick cash payment' },
  { keys: ['F10'], description: 'Quick QRIS payment' },
  { keys: ['F12'], description: 'Process payment' },
  { keys: ['Esc'], description: 'Close modal / Clear cart' },
  { keys: ['⌘', '←'], description: 'Navigate order tabs' },
];

export const shortcutsByCategory = {
  global: globalShortcuts,
  pos: posShortcuts,
};

// Helper to format keys for display
export function formatKeys(keys: string[]): string {
  return keys.join(' + ');
}

// Get platform-specific key name (⌘ for Mac, Ctrl for Windows/Linux)
export function getModKey(): '⌘' | 'Ctrl' {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl';
}

// Get shortcuts for current page
export function getShortcutsForPage(page: 'global' | 'pos'): ShortcutItem[] {
  return shortcutsByCategory[page] || [];
}
