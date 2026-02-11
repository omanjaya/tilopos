import { useState, useEffect, useRef } from 'react';
import type { NavSection } from './sidebar-nav-data';
import { SidebarNavItem } from './sidebar-nav-item';

export function SidebarFlyout({
  section,
  anchorRef,
  onClose,
  pinnedPaths,
  onTogglePin,
}: {
  section: NavSection;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  pinnedPaths: Set<string>;
  onTogglePin: (path: string) => void;
}) {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setTop(rect.top);
    }
  }, [anchorRef]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={flyoutRef}
      className="fixed z-50 ml-1 w-52 rounded-lg border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-left-2 duration-150"
      style={{ top: Math.min(top, window.innerHeight - 300), left: 72 }}
      onMouseLeave={onClose}
    >
      {section.title && (
        <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {section.title}
        </div>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={false}
            isPinned={pinnedPaths.has(item.to)}
            onTogglePin={onTogglePin}
            showPinAction
          />
        ))}
      </div>
    </div>
  );
}
