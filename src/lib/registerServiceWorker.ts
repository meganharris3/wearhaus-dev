import { Platform } from 'react-native';

/**
 * Registers the caching service worker — web only, production only. Never in dev (it would
 * serve stale bundles across reloads) and never on native (there is no navigator.serviceWorker).
 */
export function registerServiceWorker() {
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}
