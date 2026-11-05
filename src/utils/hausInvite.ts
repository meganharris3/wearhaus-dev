import { Platform } from 'react-native';

// Where invite links point when there's no browser origin to use (native builds).
const DEFAULT_APP_URL = 'https://wearhaus-dev.vercel.app';
const PENDING_KEY = 'wearhaus.pendingHausInvite';
const JOIN_PATH = /^\/join\/([A-Za-z0-9]+)\/?$/;

// Fallback for when localStorage is unavailable (private mode): survives sign-in, not a reload.
let pendingInMemory: string | null = null;

function appUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return DEFAULT_APP_URL;
}

/** The shareable link that opens the join screen for a haus's invite code. */
export function hausInviteUrl(code: string): string {
  return `${appUrl()}/join/${code}`;
}

/** The invite code in a /join/<code> path, or null. */
export function parseInviteCode(pathname: string): string | null {
  return JOIN_PATH.exec(pathname)?.[1] ?? null;
}

/**
 * If the app was opened at /join/<code>, remembers the code and tidies the URL back to "/".
 * Called once at startup, before sign-in: someone opening an invite may still have to sign
 * up or finish onboarding, so the code has to outlive those screens (and an email-confirm
 * redirect) until the signed-in app can show the join screen.
 */
export function capturePendingInvite(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const code = parseInviteCode(window.location.pathname);
  if (!code) return;
  pendingInMemory = code;
  try { window.localStorage.setItem(PENDING_KEY, code); } catch { /* storage blocked — memory only */ }
  window.history.replaceState(null, '', '/');
}

/** Returns the remembered invite code, if any, and forgets it. */
export function takePendingInvite(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  let code = pendingInMemory;
  pendingInMemory = null;
  try {
    code = window.localStorage.getItem(PENDING_KEY) ?? code;
    window.localStorage.removeItem(PENDING_KEY);
  } catch { /* storage blocked */ }
  return code;
}
