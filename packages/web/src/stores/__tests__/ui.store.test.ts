import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui.store';

describe('ui.store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useUIStore.setState({
      sidebarCollapsed: false,
      theme: 'light',
      selectedOutletId: null,
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar from collapsed to expanded', () => {
      useUIStore.setState({ sidebarCollapsed: true });
      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    it('toggles sidebar from expanded to collapsed', () => {
      useUIStore.setState({ sidebarCollapsed: false });
      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('toggles back and forth correctly', () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('sets theme to dark', () => {
      useUIStore.getState().setTheme('dark');

      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('sets theme to light', () => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setTheme('light');

      expect(useUIStore.getState().theme).toBe('light');
    });

    it('persists theme to localStorage', () => {
      useUIStore.getState().setTheme('dark');

      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('adds dark class to document element when setting dark theme', () => {
      useUIStore.getState().setTheme('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from document element when setting light theme', () => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setTheme('light');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      useUIStore.setState({ theme: 'light' });
      useUIStore.getState().toggleTheme();

      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('toggles from dark to light', () => {
      useUIStore.setState({ theme: 'dark' });
      useUIStore.getState().toggleTheme();

      expect(useUIStore.getState().theme).toBe('light');
    });
  });

  describe('setSelectedOutlet', () => {
    it('sets the selected outlet id', () => {
      useUIStore.getState().setSelectedOutletId('outlet-123');

      expect(useUIStore.getState().selectedOutletId).toBe('outlet-123');
    });

    it('persists outlet id to localStorage', () => {
      useUIStore.getState().setSelectedOutletId('outlet-456');

      expect(localStorage.getItem('selectedOutletId')).toBe('outlet-456');
    });

    it('overwrites previously selected outlet', () => {
      useUIStore.getState().setSelectedOutletId('outlet-1');
      useUIStore.getState().setSelectedOutletId('outlet-2');

      expect(useUIStore.getState().selectedOutletId).toBe('outlet-2');
      expect(localStorage.getItem('selectedOutletId')).toBe('outlet-2');
    });
  });

  describe('toggleTheme persistence', () => {
    it('persists theme after toggle', () => {
      useUIStore.setState({ theme: 'light' });
      useUIStore.getState().toggleTheme();

      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('adds dark class after toggling to dark', () => {
      useUIStore.setState({ theme: 'light' });
      useUIStore.getState().toggleTheme();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class after toggling back to light', () => {
      useUIStore.setState({ theme: 'light' });
      useUIStore.getState().toggleTheme(); // -> dark
      useUIStore.getState().toggleTheme(); // -> light

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('setSidebarCollapsed', () => {
    it('sets sidebar to collapsed', () => {
      useUIStore.getState().setSidebarCollapsed(true);

      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('sets sidebar to expanded', () => {
      useUIStore.setState({ sidebarCollapsed: true });
      useUIStore.getState().setSidebarCollapsed(false);

      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });
});
