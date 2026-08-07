import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SESSION_KEY = 'sudoku:install-prompt-shown';
const IOS_PROMPT_DELAY_MS = 1200;

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window);
}

/**
 * On iOS, every browser is a WebKit wrapper, but only Safari itself can add
 * a page to the home screen as a real standalone app (manifest + offline
 * support) — other browsers' "add to home screen" just bookmarks the URL
 * back into that browser's chrome. Chrome/Firefox/Edge/Opera on iOS tag
 * their UA distinctly; Brave deliberately mimics Safari's UA, so we fall
 * back to its injected `navigator.brave` for that case.
 */
function isIOSNonSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/crios|fxios|edgios|opios|opr\//i.test(ua)) return true;
  return 'brave' in navigator;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * Prompts once per browser session (sessionStorage, not localStorage) to add
 * the app to the home screen — skipped entirely if already installed.
 * Chrome/Android exposes `beforeinstallprompt`, which we defer and trigger
 * from our own modal; iOS Safari has no programmatic install API, so it gets
 * manual "Share → Add to Home Screen" instructions instead.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iOS] = useState(isIOSDevice);
  const [iOSNonSafari] = useState(isIOSNonSafariBrowser);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    let iosTimer: number | undefined;
    if (iOS) {
      iosTimer = window.setTimeout(() => setVisible(true), IOS_PROMPT_DELAY_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, [iOS]);

  const dismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }, [deferredPrompt, dismiss]);

  return { visible, iOS, iOSNonSafari, canInstall: deferredPrompt !== null, install, dismiss };
}
