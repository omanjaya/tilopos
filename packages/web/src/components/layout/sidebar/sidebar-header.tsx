import { ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SidebarHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border px-3', collapsed ? 'justify-center' : 'justify-between')}>
      {!collapsed && (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform duration-300 hover:scale-105">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <span className="text-base font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
            TiloPOS
          </span>
        </div>
      )}
      {collapsed && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform duration-300 hover:scale-110">
          <span className="text-sm font-bold text-primary-foreground">T</span>
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              'h-7 w-7 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && 'absolute -right-3 top-4 h-6 w-6 border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">
            {collapsed ? 'Expand' : 'Collapse'}
            <kbd className="ml-1.5 rounded bg-muted px-1 font-mono text-[10px]">⌘B</kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  const dispatchCmdK = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  if (!collapsed) {
    return (
      <div className="shrink-0 px-2.5 pt-3">
        <button
          onClick={dispatchCmdK}
          className="flex w-full items-center gap-2 rounded-lg bg-sidebar-muted px-2.5 py-2 text-xs text-sidebar-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Cari menu...</span>
          <kbd className="ml-auto rounded bg-sidebar-border px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-2 pt-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={dispatchCmdK}
            className="flex w-full items-center justify-center rounded-lg bg-sidebar-muted p-2 text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">Cari menu <kbd className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd></p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
