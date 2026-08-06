import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Detects when a new service worker has taken over (new deployment) and
 * reloads the page to pick up the new bundle. The caller is responsible for
 * showing a transition overlay while `updating` is true — the reload itself
 * happens inside `updateServiceWorker`.
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      void updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return { updating: needRefresh };
}
