import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb, getPwaPlatform, isStandalone } from '../lib/pwa';
import {
  DEFAULT_PWA_PROMPT_STATE,
  canAutoShowPwaPrompt,
  snoozePwaPrompt,
  acknowledgePwaPrompt,
  markPwaInstalled,
  type PwaPromptState,
} from '../utils/pwaPromptState';
import InstallPromptSheet from '../components/InstallPromptSheet';

const STORAGE_KEY = 'wearhaus:pwaPrompt';
const AUTO_SHOW_DELAY_MS = 1500;

export type InstallPromptSource = 'auto' | 'settings';
export type InstallPromptTrigger = 'onboarding_complete' | 'first_item_listed';
export type NativeInstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: NativeInstallOutcome }>;
}

interface InstallPromptContextValue {
  /** Whether the sheet is currently visible. */
  isOpen: boolean;
  open: (source: InstallPromptSource) => void;
  close: () => void;
  /** Opens the sheet ~1500ms later, but only if every auto-show rule allows it. */
  maybeAutoShow: (trigger: InstallPromptTrigger) => void;
  /** True once the browser has fired beforeinstallprompt (Chrome/Edge on Android). */
  canNativeInstall: boolean;
  promptNativeInstall: () => Promise<NativeInstallOutcome>;
  /** Drives the Settings "Install App" row: web, mobile, not standalone, not installed. */
  showInstallRow: boolean;
  /** "Maybe later" — snoozes for SNOOZE_DAYS and closes. */
  snooze: () => Promise<void>;
  /** "Got it" — stops auto-show permanently and closes. */
  acknowledge: () => Promise<void>;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PwaPromptState>(DEFAULT_PWA_PROMPT_STATE);
  const [isOpen, setIsOpen] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownThisSessionRef = useRef(false);
  const autoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state once, web only — native has nothing to load and nothing to show.
  useEffect(() => {
    if (!isWeb) return;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          setState({ ...DEFAULT_PWA_PROMPT_STATE, ...parsed });
        } catch {
          // malformed cache — keep defaults rather than crash
        }
      })
      .catch(() => {}); // storage unavailable — keep defaults, app continues normally
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next: PwaPromptState) => {
    stateRef.current = next;
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage write failed — state already updated in memory; app continues normally
    }
  }, []);

  const snooze = useCallback(async () => {
    await persist(snoozePwaPrompt(stateRef.current));
    setIsOpen(false);
  }, [persist]);

  const acknowledge = useCallback(async () => {
    await persist(acknowledgePwaPrompt(stateRef.current));
    setIsOpen(false);
  }, [persist]);

  // beforeinstallprompt / appinstalled — web only, Chrome/Edge on Android support these.
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
    }

    function onAppInstalled() {
      deferredPromptRef.current = null;
      setCanNativeInstall(false);
      setIsOpen(false);
      persist(markPwaInstalled(stateRef.current));
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [persist]);

  useEffect(() => () => {
    if (autoShowTimerRef.current) clearTimeout(autoShowTimerRef.current);
  }, []);

  const open = useCallback((_source: InstallPromptSource) => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const maybeAutoShow = useCallback((_trigger: InstallPromptTrigger) => {
    if (!isWeb) return;
    if (shownThisSessionRef.current) return;
    if (getPwaPlatform() === 'other') return; // phones and tablets only, no desktop
    if (isStandalone()) return;
    if (!canAutoShowPwaPrompt(stateRef.current)) return;

    if (autoShowTimerRef.current) clearTimeout(autoShowTimerRef.current);
    autoShowTimerRef.current = setTimeout(() => {
      shownThisSessionRef.current = true;
      setIsOpen(true);
    }, AUTO_SHOW_DELAY_MS);
  }, []);

  const promptNativeInstall = useCallback(async (): Promise<NativeInstallOutcome> => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return 'dismissed';
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferredPromptRef.current = null;
    setCanNativeInstall(false);
    return outcome;
  }, []);

  const showInstallRow = isWeb && getPwaPlatform() !== 'other' && !isStandalone() && !state.installed;

  return (
    <InstallPromptContext.Provider value={{
      isOpen, open, close, maybeAutoShow,
      canNativeInstall, promptNativeInstall,
      showInstallRow, snooze, acknowledge,
    }}>
      {children}
      {isWeb && (
        <InstallPromptSheet
          visible={isOpen}
          onClose={close}
          onDismissViaOverlay={snooze}
          onMaybeLater={snooze}
          onGotIt={acknowledge}
          canNativeInstall={canNativeInstall}
          onInstallNative={promptNativeInstall}
        />
      )}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt(): InstallPromptContextValue {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) throw new Error('useInstallPrompt must be used within InstallPromptProvider');
  return ctx;
}
