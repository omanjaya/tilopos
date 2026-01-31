import '@testing-library/jest-dom/vitest';

// Node.js 21+ ships a native `localStorage` that lacks the Web Storage API
// methods (getItem, setItem, removeItem, clear). jsdom provides a proper
// implementation, but on newer Node versions the native object may shadow it.
// This polyfill ensures the Web Storage API is always available in tests.
if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true, configurable: true });
}
