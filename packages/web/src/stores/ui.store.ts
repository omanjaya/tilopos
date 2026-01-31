import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  selectedOutletId: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSelectedOutletId: (id: string) => void;
}

const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: savedTheme,
  selectedOutletId: localStorage.getItem('selectedOutletId'),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    }),
  setSelectedOutletId: (id) => {
    localStorage.setItem('selectedOutletId', id);
    set({ selectedOutletId: id });
  },
}));
