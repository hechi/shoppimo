import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// The browser fires this once, early. Capture it at module load so the settings menu can use it later.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => deferredPrompt;

const isStandalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export interface InstallPromptState {
  /** The browser offered an install prompt (Chrome, Edge, Android). */
  canInstall: boolean;
  /** iOS Safari has no prompt API, so the user needs manual instructions. */
  showIosHint: boolean;
  install: () => Promise<void>;
}

export const useInstallPrompt = (): InstallPromptState => {
  const prompt = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const standalone = isStandalone();

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    deferredPrompt = null;
    notify();
  };

  return {
    canInstall: prompt !== null && !standalone,
    showIosHint: prompt === null && !standalone && isIos(),
    install,
  };
};
