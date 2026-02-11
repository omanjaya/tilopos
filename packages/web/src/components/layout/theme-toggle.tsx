import { useUIStore } from '@/stores/ui.store';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        'text-muted-foreground transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground hover:scale-105',
      )}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
