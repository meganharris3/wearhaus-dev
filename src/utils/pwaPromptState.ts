/** Persisted under AsyncStorage key 'wearhaus:pwaPrompt'. */
export interface PwaPromptState {
  /** Tapped "Got it" — stop auto-showing permanently. */
  acknowledged: boolean;
  /** The appinstalled event fired, or a standalone launch was observed. */
  installed: boolean;
  /** Times "Maybe later" was tapped. */
  snoozeCount: number;
  /** ms timestamp; auto-show is suppressed until this passes. */
  snoozedUntil: number | null;
}

export const SNOOZE_DAYS = 7;
export const MAX_SNOOZES = 3;

export const DEFAULT_PWA_PROMPT_STATE: PwaPromptState = {
  acknowledged: false,
  installed: false,
  snoozeCount: 0,
  snoozedUntil: null,
};

/**
 * Whether the persisted state alone allows an auto-show (ignores anything runtime-only, like
 * platform detection or standalone-mode — the context layer handles those separately).
 */
export function canAutoShowPwaPrompt(state: PwaPromptState, now: number = Date.now()): boolean {
  if (state.acknowledged || state.installed) return false;
  if (state.snoozeCount >= MAX_SNOOZES) return false;
  if (state.snoozedUntil != null && now <= state.snoozedUntil) return false;
  return true;
}

export function snoozePwaPrompt(state: PwaPromptState, now: number = Date.now()): PwaPromptState {
  return {
    ...state,
    snoozeCount: state.snoozeCount + 1,
    snoozedUntil: now + SNOOZE_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function acknowledgePwaPrompt(state: PwaPromptState): PwaPromptState {
  return { ...state, acknowledged: true };
}

export function markPwaInstalled(state: PwaPromptState): PwaPromptState {
  return { ...state, installed: true };
}
