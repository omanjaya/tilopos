// Recent commands storage (command palette)
const RECENT_COMMANDS_KEY = 'tilo-recent-commands';
const MAX_RECENT_COMMANDS = 10;

export function getRecentCommands(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch (error) {
    // Storage unavailable or corrupt: behave as "no recent commands"
    console.warn('[commands] cannot read recent commands', error);
    return [];
  }
}

export function addRecentCommand(commandId: string): void {
  const recent = getRecentCommands();
  const updated = [commandId, ...recent.filter((id) => id !== commandId)].slice(0, MAX_RECENT_COMMANDS);
  try {
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  } catch (error) {
    // Safari private mode / quota exceeded: recents are a convenience only
    console.warn('[commands] cannot save recent commands', error);
  }
}
