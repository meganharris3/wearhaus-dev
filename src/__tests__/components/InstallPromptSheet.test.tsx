/**
 * Component tests for InstallPromptSheet.
 *
 * Covers:
 * - visibility (nothing rendered while closed)
 * - platform toggle: defaults to the detected platform, switches on tap
 * - step content differs between iOS and Android
 * - iOS in-app-browser override replaces the steps with "open in Safari" + copy link
 * - canNativeInstall swaps the CTA to "Install Wearhaus" (Android) and offers "Show manual steps"
 * - the three dismiss paths call the right callback: X -> onClose, overlay -> onDismissViaOverlay,
 *   "Maybe later" -> onMaybeLater
 * - "Got it" CTA (no native install available) calls onGotIt
 * - benefit chips: PUSH_ENABLED is false, so the third chip is "Loads faster", not push copy
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Platform } from 'react-native';

// lib/pwa.ts freezes `isWeb` as a module-level const at first import, so it must be required
// only after Platform.OS is already 'web' — a static import here would run before any
// beforeEach and permanently freeze it false, since jest-expo's default Platform.OS is 'ios'.
jest.replaceProperty(Platform, 'OS', 'web');
const InstallPromptSheet = require('../../components/InstallPromptSheet').default;

function setUserAgent(ua: string, extra: Partial<Navigator> = {}) {
  (globalThis as any).navigator = { userAgent: ua, maxTouchPoints: 0, platform: '', ...extra };
}

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0';
const INSTAGRAM_IOS_UA = `${IOS_UA} Instagram 300.0.0`;

const originalNavigator = (globalThis as any).navigator;

function baseProps(overrides: Partial<React.ComponentProps<typeof InstallPromptSheet>> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    onDismissViaOverlay: jest.fn(),
    onMaybeLater: jest.fn(),
    onGotIt: jest.fn(),
    canNativeInstall: false,
    onInstallNative: jest.fn().mockResolvedValue('accepted' as const),
    ...overrides,
  };
}

// render() already wraps itself in act(); the component's mount effect also awaits a
// reduce-motion check, so flush that pending promise separately before asserting.
async function renderSheet(overrides: Partial<React.ComponentProps<typeof InstallPromptSheet>> = {}) {
  render(<InstallPromptSheet {...baseProps(overrides)} />);
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'web');
  setUserAgent(IOS_UA);
});

afterEach(() => {
  (globalThis as any).navigator = originalNavigator;
  jest.restoreAllMocks();
});

describe('visibility', () => {
  it('renders nothing (well, no title) when not visible', () => {
    render(<InstallPromptSheet {...baseProps({ visible: false })} />);
    expect(screen.queryByText('Add Wearhaus to your home screen')).toBeNull();
  });

  it('renders the title when visible', async () => {
    await renderSheet();
    expect(screen.getByText('Add Wearhaus to your home screen')).toBeTruthy();
  });
});

describe('platform toggle', () => {
  it('defaults to iPhone on an iOS user agent', async () => {
    setUserAgent(IOS_UA);
    await renderSheet();
    expect(screen.getByText('Add')).toBeTruthy(); // iOS step 3 bold text
  });

  it('defaults to Android on an Android user agent', async () => {
    setUserAgent(ANDROID_UA);
    await renderSheet();
    expect(screen.getByText('Install')).toBeTruthy(); // Android step 3 bold text
  });

  it('switches steps when tapping the Android segment', async () => {
    setUserAgent(IOS_UA);
    await renderSheet();
    await act(async () => { fireEvent.press(screen.getByText('Android')); });
    expect(screen.getByText('Install')).toBeTruthy();
  });

  it('switches back to iPhone steps when tapping the iPhone segment', async () => {
    setUserAgent(ANDROID_UA);
    await renderSheet();
    await act(async () => { fireEvent.press(screen.getByText('iPhone')); });
    expect(screen.getByText('Add')).toBeTruthy();
  });
});

describe('in-app browser override (iOS only)', () => {
  it('replaces the normal steps with "Open this link in Safari" and a copy-link button', async () => {
    setUserAgent(INSTAGRAM_IOS_UA);
    await renderSheet();
    expect(screen.getByText('Open this link in Safari')).toBeTruthy();
    expect(screen.getByText('Copy link')).toBeTruthy();
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('does not show the in-app-browser override on a normal Safari UA', async () => {
    setUserAgent(IOS_UA);
    await renderSheet();
    expect(screen.queryByText('Open this link in Safari')).toBeNull();
  });
});

describe('native install (Android, Chrome/Edge)', () => {
  it('shows "Install Wearhaus" as the CTA when canNativeInstall is true', async () => {
    setUserAgent(ANDROID_UA);
    await renderSheet({ canNativeInstall: true });
    expect(screen.getByText('Install Wearhaus')).toBeTruthy();
  });

  it('collapses manual steps behind "Show manual steps" when canNativeInstall is true', async () => {
    setUserAgent(ANDROID_UA);
    await renderSheet({ canNativeInstall: true });
    expect(screen.queryByText('Install')).toBeNull();
    expect(screen.getByText('Show manual steps')).toBeTruthy();
  });

  it('reveals the manual steps after tapping "Show manual steps"', async () => {
    setUserAgent(ANDROID_UA);
    await renderSheet({ canNativeInstall: true });
    await act(async () => { fireEvent.press(screen.getByText('Show manual steps')); });
    expect(screen.getByText('Install')).toBeTruthy();
  });

  it('calls onInstallNative, not onGotIt, when the native-install CTA is pressed', async () => {
    const onInstallNative = jest.fn().mockResolvedValue('accepted');
    const onGotIt = jest.fn();
    setUserAgent(ANDROID_UA);
    await renderSheet({ canNativeInstall: true, onInstallNative, onGotIt });
    await act(async () => { fireEvent.press(screen.getByText('Install Wearhaus')); });
    expect(onInstallNative).toHaveBeenCalled();
    expect(onGotIt).not.toHaveBeenCalled();
  });

  it('shows "Got it" and calls onGotIt when canNativeInstall is false', async () => {
    const onGotIt = jest.fn();
    setUserAgent(IOS_UA);
    await renderSheet({ canNativeInstall: false, onGotIt });
    await act(async () => { fireEvent.press(screen.getByText('Got it')); });
    expect(onGotIt).toHaveBeenCalled();
  });
});

describe('dismiss paths', () => {
  it('X button calls onClose only', async () => {
    const onClose = jest.fn();
    const onDismissViaOverlay = jest.fn();
    const onMaybeLater = jest.fn();
    await renderSheet({ onClose, onDismissViaOverlay, onMaybeLater });
    await act(async () => { fireEvent.press(screen.getByLabelText('Close')); });
    expect(onClose).toHaveBeenCalled();
    expect(onDismissViaOverlay).not.toHaveBeenCalled();
    expect(onMaybeLater).not.toHaveBeenCalled();
  });

  it('tapping the overlay calls onDismissViaOverlay only', async () => {
    const onClose = jest.fn();
    const onDismissViaOverlay = jest.fn();
    const onMaybeLater = jest.fn();
    await renderSheet({ onClose, onDismissViaOverlay, onMaybeLater });
    await act(async () => { fireEvent.press(screen.getByLabelText('Dismiss')); });
    expect(onDismissViaOverlay).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onMaybeLater).not.toHaveBeenCalled();
  });

  it('"Maybe later" calls onMaybeLater only', async () => {
    const onClose = jest.fn();
    const onDismissViaOverlay = jest.fn();
    const onMaybeLater = jest.fn();
    await renderSheet({ onClose, onDismissViaOverlay, onMaybeLater });
    await act(async () => { fireEvent.press(screen.getByText('Maybe later')); });
    expect(onMaybeLater).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onDismissViaOverlay).not.toHaveBeenCalled();
  });
});

describe('benefit chips', () => {
  it('shows "Loads faster" as the third chip since push notifications are not built yet', async () => {
    await renderSheet();
    expect(screen.getByText('One-tap open')).toBeTruthy();
    expect(screen.getByText('Full screen, no browser bar')).toBeTruthy();
    expect(screen.getByText('Loads faster')).toBeTruthy();
    expect(screen.queryByText('Borrow request alerts')).toBeNull();
  });
});
