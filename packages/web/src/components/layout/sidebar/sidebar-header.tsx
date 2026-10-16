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
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'h-7 w-7 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && 'absolute -right-3 top-4 h-6 w-6 border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{collapsed ? 'Perluas' : 'Ciutkan'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  // CommandPalette (mounted in AppLayout) listens for this window event
  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette', { detail: { open: true } }));
  };

  if (!collapsed) {
    return (
      <div className="shrink-0 px-2.5 pt-3">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-lg bg-sidebar-muted px-2.5 py-2 text-xs text-sidebar-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Cari menu...</span>
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-2 pt-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Cari menu"
            className="flex w-full items-center justify-center rounded-lg bg-sidebar-muted p-2 text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">Cari menu</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
