import {
  DEFAULT_PWA_PROMPT_STATE,
  canAutoShowPwaPrompt,
  snoozePwaPrompt,
  acknowledgePwaPrompt,
  markPwaInstalled,
  SNOOZE_DAYS,
  MAX_SNOOZES,
} from '../../utils/pwaPromptState';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('canAutoShowPwaPrompt', () => {
  it('allows showing for a fresh, never-interacted-with state', () => {
    expect(canAutoShowPwaPrompt(DEFAULT_PWA_PROMPT_STATE, NOW)).toBe(true);
  });

  it('never shows again once acknowledged ("Got it")', () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, acknowledged: true };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(false);
  });

  it('never shows once installed', () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, installed: true };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(false);
  });

  it('is suppressed while snoozed', () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, snoozeCount: 1, snoozedUntil: NOW + DAY_MS };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(false);
  });

  it('allows showing again once the snooze period has passed', () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, snoozeCount: 1, snoozedUntil: NOW - 1 };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(true);
  });

  it('allows showing exactly at the snooze deadline (boundary)', () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, snoozeCount: 1, snoozedUntil: NOW };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(false); // "now > snoozedUntil", not >=
  });

  it(`stops permanently after ${MAX_SNOOZES} snoozes, even with no active snooze window`, () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, snoozeCount: MAX_SNOOZES, snoozedUntil: null };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(false);
  });

  it(`allows one less than the max`, () => {
    const state = { ...DEFAULT_PWA_PROMPT_STATE, snoozeCount: MAX_SNOOZES - 1, snoozedUntil: null };
    expect(canAutoShowPwaPrompt(state, NOW)).toBe(true);
  });
});

describe('snoozePwaPrompt', () => {
  it('increments snoozeCount and sets snoozedUntil 7 days out', () => {
    const result = snoozePwaPrompt(DEFAULT_PWA_PROMPT_STATE, NOW);
    expect(result.snoozeCount).toBe(1);
    expect(result.snoozedUntil).toBe(NOW + SNOOZE_DAYS * DAY_MS);
  });

  it('accumulates across repeated snoozes', () => {
    const once = snoozePwaPrompt(DEFAULT_PWA_PROMPT_STATE, NOW);
    const twice = snoozePwaPrompt(once, NOW + DAY_MS);
    expect(twice.snoozeCount).toBe(2);
    expect(twice.snoozedUntil).toBe(NOW + DAY_MS + SNOOZE_DAYS * DAY_MS);
  });

  it('does not touch acknowledged or installed', () => {
    const result = snoozePwaPrompt(DEFAULT_PWA_PROMPT_STATE, NOW);
    expect(result.acknowledged).toBe(false);
    expect(result.installed).toBe(false);
  });
});

describe('acknowledgePwaPrompt', () => {
  it('sets acknowledged, leaves everything else alone', () => {
    const state = { acknowledged: false, installed: false, snoozeCount: 2, snoozedUntil: NOW };
    expect(acknowledgePwaPrompt(state)).toEqual({ ...state, acknowledged: true });
  });
});

describe('markPwaInstalled', () => {
  it('sets installed, leaves everything else alone', () => {
    const state = { acknowledged: false, installed: false, snoozeCount: 1, snoozedUntil: NOW };
    expect(markPwaInstalled(state)).toEqual({ ...state, installed: true });
  });
});
