interface Command {
  id: string;
  label: string;
  category: 'pages' | 'actions' | 'settings' | 'help';
  icon: string;
  shortcut?: string;
  action: () => void | string;
  keywords?: string[];
}

// Type for the command palette items
export interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

// This will be populated when the component is created
// Categories for command palette organization
export const commandCategories = [
  { id: 'pages', name: 'Pages', icon: 'Layout' },
  { id: 'actions', name: 'Actions', icon: 'Zap' },
  { id: 'settings', name: 'Settings', icon: 'Settings' },
  { id: 'help', name: 'Help', icon: 'HelpCircle' },
];

// Recent commands storage key
export const RECENT_COMMANDS_KEY = 'tilo-recent-commands';
export const MAX_RECENT_COMMANDS = 10;

// Helper functions for localStorage
export function getRecentCommands(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function addRecentCommand(commandId: string): void {
  const recent = getRecentCommands();
  // Remove if already exists (to move to front)
  const filtered = recent.filter(id => id !== commandId);
  // Add to front
  const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
  localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
}

export function clearRecentCommands(): void {
  localStorage.removeItem(RECENT_COMMANDS_KEY);
}
