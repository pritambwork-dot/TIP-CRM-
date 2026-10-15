/**
 * TIP CRM - PWA Service Worker Registration Helper
 */

import { clientSafeLogger } from './safeErrors';

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Only register if served over HTTPS or localhost
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === '[::1]';

    if (window.location.protocol === 'https:' || isLocalhost) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    clientSafeLogger.info('New TIP CRM service worker installed.');
                  }
                };
              }
            };
          })
          .catch((err) => {
            clientSafeLogger.warn('ServiceWorker registration skipped or failed:', err?.message);
          });
      });
    }
  }
}
