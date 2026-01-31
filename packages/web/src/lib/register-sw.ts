/**
 * Service Worker Registration
 *
 * Registers the service worker for PWA support.
 * Handles updates and provides lifecycle callbacks.
 */

interface SWCallbacks {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export function registerServiceWorker(callbacks?: SWCallbacks): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state !== 'installed') return;

            if (navigator.serviceWorker.controller) {
              // New content available; notify the app
              callbacks?.onUpdate?.(registration);
            } else {
              // Content cached for the first time
              callbacks?.onSuccess?.(registration);
            }
          };
        };
      })
      .catch((error: Error) => {
        callbacks?.onError?.(error);
      });
  });
}

export function unregisterServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then((registration) => {
      void registration.unregister();
    })
    .catch(() => {
      // Silent fail
    });
}
