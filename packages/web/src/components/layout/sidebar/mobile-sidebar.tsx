import { NavLink } from 'react-router-dom';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarState } from './use-sidebar-state';
import { SidebarUser } from './sidebar-user';
import { exactMatchPaths, type NavItem } from './sidebar-nav-data';

interface MobileSidebarProps {
  onClose: () => void;
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const { pinnedNavItems, filteredSections } = useSidebarState();

  return (
    <aside className="flex h-screen w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <span className="text-base font-bold tracking-tight">TiloPOS</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          aria-label="Tutup sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        {/* Pinned / Favorites */}
        {pinnedNavItems.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold text-amber-500/70">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>Favorit</span>
            </div>
            <div className="space-y-0.5">
              {pinnedNavItems.map((item) => (
                <MobileNavLink key={item.to} item={item} onNavigate={onClose} />
              ))}
            </div>
            <div className="mt-2.5 border-t border-sidebar-border" />
          </div>
        )}

        {/* All sections — flat, no accordion */}
        {filteredSections.map((section) => (
          <div key={section.id} className="mb-3">
            {section.title && (
              <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted-foreground/60">
                {section.icon && <section.icon className="h-3.5 w-3.5" />}
                <span>{section.title}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <MobileNavLink key={item.to} item={item} onNavigate={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <SidebarUser collapsed={false} />
    </aside>
  );
}

function MobileNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app' || exactMatchPaths.has(item.to)}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
          'transition-colors duration-150',
          isActive
            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
            : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}
