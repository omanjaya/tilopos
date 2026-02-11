import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarHeader, SidebarSearch } from './sidebar-header';
import { SidebarNavItem } from './sidebar-nav-item';
import { SidebarSectionWrapper } from './sidebar-section';
import { SidebarFlyout } from './sidebar-flyout';
import { SidebarUser } from './sidebar-user';
import { useSidebarState } from './use-sidebar-state';

export function Sidebar() {
  const {
    collapsed,
    toggleSidebar,
    pinnedSet,
    pinnedNavItems,
    togglePin,
    filteredSections,
    expandedSections,
    toggleSection,
    expandedItemSections,
    toggleExpandItems,
    activeSectionId,
    flyoutSection,
    flyoutAnchorRef,
    handleSectionHover,
    handleSectionLeave,
    closeFlyout,
  } = useSidebarState();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <SidebarHeader collapsed={collapsed} onToggle={toggleSidebar} />
        <SidebarSearch collapsed={collapsed} />

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-2">
          {/* Favorites / Pinned section */}
          {pinnedNavItems.length > 0 && (
            <div className="mb-3">
              {!collapsed && (
                <div className="mb-1 flex items-center gap-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500/70">
                  <Star className="h-3 w-3 fill-current" />
                  <span>Favorit</span>
                </div>
              )}
              {collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-md text-amber-500/50">
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs font-medium">Favorit</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="space-y-0.5">
                {pinnedNavItems.map((item) => (
                  collapsed ? (
                    <Tooltip key={`pin-${item.to}`}>
                      <TooltipTrigger asChild>
                        <div>
                          <SidebarNavItem
                            item={item}
                            collapsed={collapsed}
                            isPinned
                            onTogglePin={togglePin}
                            showPinAction={false}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarNavItem
                      key={`pin-${item.to}`}
                      item={item}
                      collapsed={collapsed}
                      isPinned
                      onTogglePin={togglePin}
                      showPinAction
                    />
                  )
                ))}
              </div>
              {/* Divider after favorites */}
              <div className={cn('mt-2 border-t border-sidebar-border', collapsed && 'mx-2')} />
            </div>
          )}

          {/* Main sections */}
          {filteredSections.map((section) => (
            <SidebarSectionWrapper
              key={section.id}
              section={section}
              collapsed={collapsed}
              isExpanded={expandedSections.has(section.id)}
              onToggleExpand={() => toggleSection(section.id)}
              expandedItems={expandedItemSections.has(section.id)}
              onToggleExpandItems={() => toggleExpandItems(section.id)}
              pinnedPaths={pinnedSet}
              onTogglePin={togglePin}
              activeSectionId={activeSectionId}
              onSectionHover={handleSectionHover}
              onSectionLeave={handleSectionLeave}
            />
          ))}
        </nav>

        <SidebarUser collapsed={collapsed} />

        {/* Collapsed fly-out */}
        {collapsed && flyoutSection && (
          <SidebarFlyout
            section={flyoutSection}
            anchorRef={flyoutAnchorRef}
            onClose={closeFlyout}
            pinnedPaths={pinnedSet}
            onTogglePin={togglePin}
          />
        )}
      </aside>
    </TooltipProvider>
  );
}
