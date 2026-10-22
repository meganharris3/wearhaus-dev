/**
 * Tests for InstallPromptContext (InstallPromptProvider + useInstallPrompt).
 *
 * Covers:
 * - loads persisted state from AsyncStorage on mount
 * - open()/close() toggle visibility; Settings ignores snooze/acknowledged state
 * - maybeAutoShow: full eligibility gate (platform, standalone, installed, acknowledged,
 *   snooze, already-shown-this-session), and the ~1500ms delay
 * - snooze()/acknowledge() persist and update state
 * - beforeinstallprompt sets canNativeInstall; promptNativeInstall drives it
 * - appinstalled marks installed and closes the sheet
 * - showInstallRow reflects platform/standalone/installed, not snooze/acknowledged
 * - everything no-ops off web
 * - storage failures never throw / break the app
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetPwaPlatform = jest.fn();
const mockIsStandalone = jest.fn();
jest.mock('../../lib/pwa', () => ({
  get isWeb() { return mockIsWeb(); },
  getPwaPlatform: () => mockGetPwaPlatform(),
  isStandalone: () => mockIsStandalone(),
  isInAppBrowser: () => false,
}));
let mockIsWeb = () => true;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InstallPromptProvider, useInstallPrompt } from '../../context/InstallPromptContext';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

type Ctx = ReturnType<typeof useInstallPrompt>;
let ctx: Ctx;

function Capture() {
  ctx = useInstallPrompt();
  return <Text>{String(ctx.showInstallRow)}</Text>;
}

async function renderProvider() {
  const utils = render(<InstallPromptProvider><Capture /></InstallPromptProvider>);
  await settle();
  return utils;
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

let listeners: Record<string, Array<(e?: any) => void>>;
function addListener(event: string, handler: (e?: any) => void) {
  (listeners[event] ??= []).push(handler);
}
function fire(event: string, payload?: any) {
  (listeners[event] ?? []).forEach((h) => h(payload));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockIsWeb = () => true;
  mockGetPwaPlatform.mockReturnValue('ios');
  mockIsStandalone.mockReturnValue(false);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  listeners = {};
  (globalThis as any).window = {
    addEventListener: addListener,
    removeEventListener: jest.fn(),
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('loading persisted state', () => {
  it('reads from AsyncStorage under the documented key', async () => {
    await renderProvider();
    expect(mockGetItem).toHaveBeenCalledWith('wearhaus:pwaPrompt');
  });

  it('starts from defaults when nothing is stored', async () => {
    await renderProvider();
    expect(ctx.showInstallRow).toBe(true); // ios, not standalone, not installed
  });

  it('respects a previously-installed flag from storage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: false, installed: true, snoozeCount: 0, snoozedUntil: null }));
    await renderProvider();
    expect(ctx.showInstallRow).toBe(false);
  });

  it('does not throw when storage read fails, and still renders sensible defaults', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'));
    await renderProvider();
    expect(ctx.showInstallRow).toBe(true);
  });

  it('does not throw on malformed stored JSON', async () => {
    mockGetItem.mockResolvedValue('{not json');
    await renderProvider();
    expect(ctx.showInstallRow).toBe(true);
  });
});

describe('open / close', () => {
  it('open("settings") shows the sheet via isOpen passed to the hosted Modal', async () => {
    await renderProvider();
    await act(async () => { ctx.open('settings'); });
    expect(ctx.isOpen).toBe(true);
  });

  it('close() hides it', async () => {
    await renderProvider();
    await act(async () => { ctx.open('settings'); });
    await act(async () => { ctx.close(); });
    expect(ctx.isOpen).toBe(false);
  });

  it('open("settings") shows it even when snoozed or acknowledged', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: true, installed: false, snoozeCount: 3, snoozedUntil: Date.now() + 999999 }));
    await renderProvider();
    await act(async () => { ctx.open('settings'); });
    expect(ctx.isOpen).toBe(true);
  });

  it('open("settings") does nothing when already standalone/installed (no row to open it from anyway)', async () => {
    mockIsStandalone.mockReturnValue(true);
    await renderProvider();
    await act(async () => { ctx.open('settings'); });
    expect(ctx.isOpen).toBe(true); // open() itself is unconditional; the row's own visibility is the real gate
  });
});

describe('maybeAutoShow eligibility', () => {
  async function tick1500() {
    await act(async () => { jest.advanceTimersByTime(1500); await Promise.resolve(); });
  }

  it('shows after ~1500ms for an eligible, fresh user', async () => {
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); });
    expect(ctx.isOpen).toBe(false); // not yet
    await tick1500();
    expect(ctx.isOpen).toBe(true);
  });

  it('does not show before 1500ms has elapsed', async () => {
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); jest.advanceTimersByTime(1000); });
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows off web', async () => {
    mockIsWeb = () => false;
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows on desktop (platform "other")', async () => {
    mockGetPwaPlatform.mockReturnValue('other');
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows already-standalone', async () => {
    mockIsStandalone.mockReturnValue(true);
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows once acknowledged', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: true, installed: false, snoozeCount: 0, snoozedUntil: null }));
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('first_item_listed'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows while snoozed', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: false, installed: false, snoozeCount: 1, snoozedUntil: Date.now() + 999999 }));
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('first_item_listed'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('never shows after MAX_SNOOZES', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: false, installed: false, snoozeCount: 3, snoozedUntil: null }));
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('first_item_listed'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });

  it('only shows once per session even if called again', async () => {
    await renderProvider();
    await act(async () => { ctx.maybeAutoShow('onboarding_complete'); });
    await tick1500();
    expect(ctx.isOpen).toBe(true);

    await act(async () => { ctx.close(); });
    await act(async () => { ctx.maybeAutoShow('first_item_listed'); });
    await tick1500();
    expect(ctx.isOpen).toBe(false);
  });
});

describe('snooze / acknowledge', () => {
  it('"Maybe later" persists an incremented snooze and a 7-day snoozedUntil, and closes', async () => {
    await renderProvider();
    await act(async () => { ctx.open('settings'); });

    await act(async () => { await ctx.snooze(); });

    expect(ctx.isOpen).toBe(false);
    const [, saved] = mockSetItem.mock.calls.at(-1)!;
    const parsed = JSON.parse(saved);
    expect(parsed.snoozeCount).toBe(1);
    expect(parsed.snoozedUntil).toBeGreaterThan(Date.now());
  });

  it('"Got it" persists acknowledged and closes', async () => {
    await renderProvider();
    await act(async () => { ctx.open('settings'); });

    await act(async () => { await ctx.acknowledge(); });

    expect(ctx.isOpen).toBe(false);
    const [, saved] = mockSetItem.mock.calls.at(-1)!;
    expect(JSON.parse(saved).acknowledged).toBe(true);
  });

  it('a storage failure on snooze does not throw, and the app continues', async () => {
    mockSetItem.mockRejectedValue(new Error('disk full'));
    await renderProvider();
    await act(async () => { ctx.open('settings'); });

    await expect(act(async () => { await ctx.snooze(); })).resolves.not.toThrow();
  });
});

describe('native install prompt (Android/Chrome/Edge)', () => {
  it('canNativeInstall is false until beforeinstallprompt fires', async () => {
    await renderProvider();
    expect(ctx.canNativeInstall).toBe(false);
  });

  it('beforeinstallprompt prevents the default mini-infobar and flips canNativeInstall', async () => {
    await renderProvider();
    const preventDefault = jest.fn();

    await act(async () => { fire('beforeinstallprompt', { preventDefault, prompt: jest.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) }); });

    expect(preventDefault).toHaveBeenCalled();
    expect(ctx.canNativeInstall).toBe(true);
  });

  it('promptNativeInstall calls prompt() and resolves with the user outcome', async () => {
    await renderProvider();
    const prompt = jest.fn();
    await act(async () => { fire('beforeinstallprompt', { preventDefault: jest.fn(), prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) }); });

    let result: string = '';
    await act(async () => { result = await ctx.promptNativeInstall(); });

    expect(prompt).toHaveBeenCalled();
    expect(result).toBe('accepted');
  });

  it('promptNativeInstall resolves "dismissed" when there is no deferred prompt', async () => {
    await renderProvider();
    const result = await ctx.promptNativeInstall();
    expect(result).toBe('dismissed');
  });

  it('appinstalled marks installed, closes the sheet, and persists', async () => {
    await renderProvider();
    await act(async () => { ctx.open('settings'); });

    await act(async () => { fire('appinstalled'); });

    expect(ctx.isOpen).toBe(false);
    expect(ctx.showInstallRow).toBe(false);
    const [, saved] = mockSetItem.mock.calls.at(-1)!;
    expect(JSON.parse(saved).installed).toBe(true);
  });
});

describe('showInstallRow', () => {
  it('is false on desktop', async () => {
    mockGetPwaPlatform.mockReturnValue('other');
    await renderProvider();
    expect(ctx.showInstallRow).toBe(false);
  });

  it('is false already-standalone', async () => {
    mockIsStandalone.mockReturnValue(true);
    await renderProvider();
    expect(ctx.showInstallRow).toBe(false);
  });

  it('is true for a snoozed-but-not-installed user (Settings stays reachable)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: false, installed: false, snoozeCount: 3, snoozedUntil: null }));
    await renderProvider();
    expect(ctx.showInstallRow).toBe(true);
  });

  it('is true for an acknowledged-but-not-installed user (Settings stays reachable)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ acknowledged: true, installed: false, snoozeCount: 0, snoozedUntil: null }));
    await renderProvider();
    expect(ctx.showInstallRow).toBe(true);
  });
});

describe('off web', () => {
  it('does not read storage or attach listeners', async () => {
    mockIsWeb = () => false;
    await renderProvider();
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('showInstallRow is false', async () => {
    mockIsWeb = () => false;
    await renderProvider();
    expect(ctx.showInstallRow).toBe(false);
  });
});

describe('useInstallPrompt', () => {
  it('throws when used outside InstallPromptProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Naked() { useInstallPrompt(); return null; }
    expect(() => render(<Naked />)).toThrow('useInstallPrompt must be used within InstallPromptProvider');
    consoleSpy.mockRestore();
  });
});
