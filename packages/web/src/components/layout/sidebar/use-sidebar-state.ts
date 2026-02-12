import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui.store';
import { useFeatureStore } from '@/stores/feature.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import {
  navSections,
  settingsItems,
  navItemMap,
  ROLE_ALLOWED_PATHS,
  MAX_PINS,
  loadPinnedItems,
  savePinnedItems,
  type NavItem,
  type NavSection,
} from './sidebar-nav-data';

export function useSidebarState() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const isPathVisible = useFeatureStore((s) => s.isPathVisible);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const userRole = user?.role ?? 'cashier';

  // ── Pinned items ───────────────────────────────────────────────────────────

  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => loadPinnedItems(userRole));
  const pinnedSet = useMemo(() => new Set(pinnedPaths), [pinnedPaths]);

  const togglePin = useCallback((path: string) => {
    setPinnedPaths((prev) => {
      let next: string[];
      if (prev.includes(path)) {
        next = prev.filter((p) => p !== path);
      } else if (prev.length >= MAX_PINS) {
        toast.warning({ title: `Maksimal ${MAX_PINS} pin`, description: 'Hapus pin lain untuk menambah yang baru' });
        return prev;
      } else {
        next = [...prev, path];
      }
      savePinnedItems(next);
      return next;
    });
  }, []);

  const reorderPins = useCallback((fromIndex: number, toIndex: number) => {
    setPinnedPaths((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (moved !== undefined) next.splice(toIndex, 0, moved);
      savePinnedItems(next);
      return next;
    });
  }, []);

  // ── Role + feature filtering ───────────────────────────────────────────────

  const filteredSections = useMemo(() => {
    const allowedPaths = ROLE_ALLOWED_PATHS[userRole];
    const hasRoleFilter = allowedPaths.length > 0;

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (hasRoleFilter && !allowedPaths.includes(item.to)) return false;
          if (!isPathVisible(item.to)) return false;
          // Hide pinned items from their original section (they appear in Favorit)
          if (pinnedSet.has(item.to)) return false;
          return true;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [isPathVisible, userRole, pinnedSet]);

  const pinnedNavItems = useMemo(() => {
    const allowedPaths = ROLE_ALLOWED_PATHS[userRole];
    const hasRoleFilter = allowedPaths.length > 0;

    return pinnedPaths
      .map((path) => navItemMap.get(path))
      .filter((item): item is NavItem => {
        if (!item) return false;
        if (hasRoleFilter && !allowedPaths.includes(item.to)) return false;
        return isPathVisible(item.to);
      });
  }, [pinnedPaths, isPathVisible, userRole]);

  // ── Section expand/collapse ────────────────────────────────────────────────

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebarExpandedSections_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Accordion: only keep at most one section expanded
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set([parsed[0]]);
        }
      } catch { /* ignore */ }
    }
    return new Set<string>();
  });

  useEffect(() => {
    localStorage.setItem('sidebarExpandedSections_v2', JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      if (prev.has(id)) {
        // Closing: just remove it
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      // Opening: accordion — only keep this one open
      return new Set([id]);
    });
  }, []);

  // ── "Lihat semua" per section ──────────────────────────────────────────────

  const [expandedItemSections, setExpandedItemSections] = useState<Set<string>>(new Set());

  const toggleExpandItems = useCallback((id: string) => {
    setExpandedItemSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Active section detection ───────────────────────────────────────────────

  const activeSectionId = useMemo(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) {
          return section.id;
        }
      }
    }
    for (const item of settingsItems) {
      if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) {
        return 'settings';
      }
    }
    return null;
  }, [location.pathname]);

  // Auto-expand active section (accordion: only this one stays open)
  useEffect(() => {
    if (activeSectionId && activeSectionId !== 'settings') {
      setExpandedSections((prev) => {
        if (prev.size === 1 && prev.has(activeSectionId)) return prev;
        return new Set([activeSectionId]);
      });
    }
  }, [activeSectionId]);

  // ── Collapsed fly-out ──────────────────────────────────────────────────────

  const [flyoutSection, setFlyoutSection] = useState<NavSection | null>(null);
  const flyoutAnchorRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSectionHover = useCallback((section: NavSection, el: HTMLDivElement) => {
    if (!collapsed) return;
    clearTimeout(hoverTimeoutRef.current);
    flyoutAnchorRef.current = el;
    setFlyoutSection(section);
  }, [collapsed]);

  const handleSectionLeave = useCallback(() => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => setFlyoutSection(null), 150);
  }, [collapsed]);

  const closeFlyout = useCallback(() => setFlyoutSection(null), []);

  return {
    collapsed,
    toggleSidebar,
    // Pins
    pinnedSet,
    pinnedNavItems,
    togglePin,
    reorderPins,
    // Sections
    filteredSections,
    expandedSections,
    toggleSection,
    expandedItemSections,
    toggleExpandItems,
    activeSectionId,
    // Flyout
    flyoutSection,
    flyoutAnchorRef,
    handleSectionHover,
    handleSectionLeave,
    closeFlyout,
  };
}
