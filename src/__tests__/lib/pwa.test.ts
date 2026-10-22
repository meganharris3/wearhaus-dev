/**
 * Tests for src/lib/pwa.ts — platform/standalone/in-app-browser detection.
 * Every function here must be a safe no-op off web (native has no navigator/window), and
 * these are the signals the install sheet and its auto-show rules are built on, so a wrong
 * answer here means the sheet shows (or doesn't) in the wrong places.
 */
import { Platform } from 'react-native';

function setUserAgent(ua: string, extra: Partial<Navigator> = {}) {
  (globalThis as any).navigator = { userAgent: ua, maxTouchPoints: 0, platform: '', ...extra };
}

const originalNavigator = (globalThis as any).navigator;
const originalWindow = (globalThis as any).window;

afterEach(() => {
  (globalThis as any).navigator = originalNavigator;
  (globalThis as any).window = originalWindow;
  jest.restoreAllMocks();
});

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';

describe('isWeb', () => {
  it('reflects Platform.OS', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(require('../../lib/pwa').isWeb).toBe(true);
  });
});

describe('getPwaPlatform', () => {
  it('returns "other" off web, without touching navigator', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { getPwaPlatform } = require('../../lib/pwa');
    expect(getPwaPlatform()).toBe('other');
  });

  it('detects iPhone', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(IOS_UA);
    expect(require('../../lib/pwa').getPwaPlatform()).toBe('ios');
  });

  it('detects iPad reporting as a Mac with touch (iPadOS default UA)', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(DESKTOP_UA, { platform: 'MacIntel', maxTouchPoints: 5 });
    expect(require('../../lib/pwa').getPwaPlatform()).toBe('ios');
  });

  it('does not mistake a real desktop Mac (no touch points) for iPad', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(DESKTOP_UA, { platform: 'MacIntel', maxTouchPoints: 0 });
    expect(require('../../lib/pwa').getPwaPlatform()).toBe('other');
  });

  it('detects Android', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(ANDROID_UA);
    expect(require('../../lib/pwa').getPwaPlatform()).toBe('android');
  });

  it('returns "other" for desktop', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(DESKTOP_UA, { platform: 'MacIntel', maxTouchPoints: 0 });
    expect(require('../../lib/pwa').getPwaPlatform()).toBe('other');
  });
});

describe('isStandalone', () => {
  it('is false off web', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(require('../../lib/pwa').isStandalone()).toBe(false);
  });

  it('is true when the display-mode media query matches (Android/desktop PWA)', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(ANDROID_UA);
    (globalThis as any).window = { matchMedia: (q: string) => ({ matches: q.includes('standalone') }) };
    expect(require('../../lib/pwa').isStandalone()).toBe(true);
  });

  it('is true when navigator.standalone is set (iOS Safari PWA)', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(IOS_UA, { standalone: true } as any);
    (globalThis as any).window = { matchMedia: () => ({ matches: false }) };
    expect(require('../../lib/pwa').isStandalone()).toBe(true);
  });

  it('is false in an ordinary browser tab', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(IOS_UA);
    (globalThis as any).window = { matchMedia: () => ({ matches: false }) };
    expect(require('../../lib/pwa').isStandalone()).toBe(false);
  });
});

describe('isInAppBrowser', () => {
  it('is false off web', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(require('../../lib/pwa').isInAppBrowser()).toBe(false);
  });

  it.each([
    ['Instagram',  'Mozilla/5.0 (iPhone; ...) Instagram 300.0.0'],
    ['TikTok',     'Mozilla/5.0 (iPhone; ...) musical_ly_2022'],
    ['Facebook',   'Mozilla/5.0 (iPhone; ...) FBAN/FBIOS;FBAV/400'],
    ['Snapchat',   'Mozilla/5.0 (iPhone; ...) Snapchat/12.0'],
    ['Twitter',    'Mozilla/5.0 (iPhone; ...) Twitter for iPhone'],
    ['LinkedIn',   'Mozilla/5.0 (iPhone; ...) LinkedInApp'],
    ['Google App', 'Mozilla/5.0 (iPhone; ...) GSA/300'],
  ])('flags %s as an in-app browser', (_name, ua) => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(ua);
    expect(require('../../lib/pwa').isInAppBrowser()).toBe(true);
  });

  it('is false in real Safari', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(IOS_UA + ' Version/17.0 Safari/605.1.15');
    expect(require('../../lib/pwa').isInAppBrowser()).toBe(false);
  });

  it('is false in real Chrome', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setUserAgent(ANDROID_UA);
    expect(require('../../lib/pwa').isInAppBrowser()).toBe(false);
  });
});
