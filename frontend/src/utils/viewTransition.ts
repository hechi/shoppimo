import { flushSync } from 'react-dom';

/**
 * Runs a synchronous React state update inside a view transition so the browser animates
 * the resulting DOM change. Browsers without view transitions apply the update immediately.
 */
export const withViewTransition = (update: () => void): void => {
  if (typeof document.startViewTransition !== 'function') {
    update();
    return;
  }
  document.startViewTransition(() => {
    flushSync(update);
  });
};
