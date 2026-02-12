import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NavSection } from './sidebar-nav-data';
import { SidebarNavItem } from './sidebar-nav-item';

/** A collapsible section with optional "Lihat semua" truncation */
export function SidebarSection({
  section,
  collapsed,
  isExpanded,
  onToggleExpand,
  expandedItems,
  onToggleExpandItems,
  pinnedPaths,
  onTogglePin,
  activeSectionId,
}: {
  section: NavSection;
  collapsed: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  expandedItems: boolean;
  onToggleExpandItems: () => void;
  pinnedPaths: Set<string>;
  onTogglePin: (path: string) => void;
  activeSectionId: string | null;
}) {
  const hasTitle = !!section.title;
  const maxVisible = section.maxVisible ?? section.items.length;
  const hasOverflow = section.items.length > maxVisible;
  const visibleItems = expandedItems ? section.items : section.items.slice(0, maxVisible);
  const hiddenCount = section.items.length - maxVisible;
  const isActiveSection = activeSectionId === section.id;

  return (
    <div className={cn('mt-2 first:mt-0')}>
      {/* Section header */}
      {hasTitle && !collapsed && (
        <button
          onClick={onToggleExpand}
          className={cn(
            'mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[13px] font-semibold',
            'transition-all duration-200 hover:pl-3',
            isActiveSection
              ? 'text-primary'
              : 'text-sidebar-muted-foreground/70 hover:text-sidebar-muted-foreground',
          )}
        >
          <span>{section.title}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-300 ease-out',
              !isExpanded && '-rotate-90',
            )}
          />
        </button>
      )}

      {/* Collapsed mode: section icon with indicator */}
      {collapsed && hasTitle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                isActiveSection
                  ? 'bg-primary/15 text-primary'
                  : 'text-sidebar-muted-foreground/50',
              )}
            >
              {section.icon && <section.icon className="h-3.5 w-3.5" />}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs font-medium">{section.title}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Section items */}
      <div
        className={cn(
          'space-y-0.5 overflow-hidden transition-all duration-300 ease-out',
          !collapsed && hasTitle && !isExpanded && 'max-h-0 opacity-0 -translate-y-1',
          (isExpanded || !hasTitle || collapsed) && 'max-h-[1000px] opacity-100 translate-y-0',
        )}
      >
        {visibleItems.map((item) => (
          collapsed ? (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <div>
                  <SidebarNavItem
                    item={item}
                    collapsed={collapsed}
                    isPinned={pinnedPaths.has(item.to)}
                    onTogglePin={onTogglePin}
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
              key={item.to}
              item={item}
              collapsed={collapsed}
              isPinned={pinnedPaths.has(item.to)}
              onTogglePin={onTogglePin}
              showPinAction
            />
          )
        ))}

        {/* "Lihat semua" / "Sembunyikan" toggle */}
        {hasOverflow && !collapsed && isExpanded && (
          <button
            onClick={onToggleExpandItems}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-sidebar-muted-foreground/60 transition-all duration-200 hover:text-sidebar-primary hover:translate-x-0.5"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandedItems && 'rotate-180')} />
            <span>{expandedItems ? 'Sembunyikan' : `Lihat semua (${hiddenCount} lagi)`}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Wrapper that handles hover fly-out ref for collapsed mode */
export function SidebarSectionWrapper({
  section,
  collapsed,
  isExpanded,
  onToggleExpand,
  expandedItems,
  onToggleExpandItems,
  pinnedPaths,
  onTogglePin,
  activeSectionId,
  onSectionHover,
  onSectionLeave,
}: {
  section: NavSection;
  collapsed: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  expandedItems: boolean;
  onToggleExpandItems: () => void;
  pinnedPaths: Set<string>;
  onTogglePin: (path: string) => void;
  activeSectionId: string | null;
  onSectionHover: (section: NavSection, el: HTMLDivElement) => void;
  onSectionLeave: () => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={sectionRef}
      onMouseEnter={() => collapsed && section.title && sectionRef.current && onSectionHover(section, sectionRef.current)}
      onMouseLeave={onSectionLeave}
    >
      <SidebarSection
        section={section}
        collapsed={collapsed}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        expandedItems={expandedItems}
        onToggleExpandItems={onToggleExpandItems}
        pinnedPaths={pinnedPaths}
        onTogglePin={onTogglePin}
        activeSectionId={activeSectionId}
      />
    </div>
  );
}
