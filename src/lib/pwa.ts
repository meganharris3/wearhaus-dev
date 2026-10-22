import { Platform } from 'react-native';

export type PwaPlatform = 'ios' | 'android' | 'other';

export const isWeb = Platform.OS === 'web';

export const getPwaPlatform = (): PwaPlatform => {
  if (!isWeb || typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIpadOs) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
};

export const isStandalone = (): boolean => {
  if (!isWeb || typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
};

// Instagram, TikTok, Snapchat, Facebook, etc. open links in an in-app browser that can't install web apps
export const isInAppBrowser = (): boolean =>
  isWeb && /FBAN|FBAV|Instagram|Snapchat|TikTok|musical_ly|Line\/|Twitter|LinkedInApp|GSA\//i.test(navigator.userAgent);
