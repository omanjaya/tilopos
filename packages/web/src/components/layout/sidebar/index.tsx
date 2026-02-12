import { useRef, useState } from 'react';
import { Star, GripVertical } from 'lucide-react';
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
    reorderPins,
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

  // ── Drag-and-drop state for pinned items ──
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.4';
      }
    });
  };

  const handleDragOver = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex === null || index === dragIndex) {
      setDropIndex(null);
      return;
    }
    setDropIndex(index);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      reorderPins(dragIndex, dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
    dragNodeRef.current = null;
  };

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
                <div className="mb-0.5 flex items-center gap-1 px-2.5 text-[11px] font-semibold text-amber-500/70">
                  <Star className="h-3.5 w-3.5 fill-current" />
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
                {pinnedNavItems.map((item, index) => (
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
                    <div
                      key={`pin-${item.to}`}
                      draggable
                      onDragStart={(e) => handleDragStart(index, e)}
                      onDragOver={(e) => handleDragOver(index, e)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group/drag relative transition-all duration-150',
                        dragIndex === index && 'opacity-40',
                        dropIndex === index && dragIndex !== null && (
                          dragIndex < index
                            ? 'border-b-2 border-primary/50 pb-0.5'
                            : 'border-t-2 border-primary/50 pt-0.5'
                        ),
                      )}
                    >
                      {/* Drag handle */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 opacity-0 group-hover/drag:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing z-10 transition-opacity duration-150">
                        <GripVertical className="h-3.5 w-3.5 text-sidebar-muted-foreground" />
                      </div>
                      <SidebarNavItem
                        item={item}
                        collapsed={collapsed}
                        isPinned
                        onTogglePin={togglePin}
                        showPinAction
                      />
                    </div>
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
