import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui.store';
import { useFeatureStore } from '@/stores/feature.store';
import { useAuthStore } from '@/stores/auth.store';
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
        return prev;
      } else {
        next = [...prev, path];
      }
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
          return isPathVisible(item.to);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [isPathVisible, userRole]);

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
        return new Set(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    return new Set(navSections.map((s) => s.id));
  });

  useEffect(() => {
    localStorage.setItem('sidebarExpandedSections_v2', JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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

  // Auto-expand active section
  useEffect(() => {
    if (activeSectionId && activeSectionId !== 'settings') {
      setExpandedSections((prev) => {
        if (prev.has(activeSectionId)) return prev;
        const next = new Set(prev);
        next.add(activeSectionId);
        return next;
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
