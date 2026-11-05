/**
 * Tests for src/utils/hausInvite.ts — building /join/<code> links, and holding onto a code the
 * app was opened with until the user is signed in (they may have to sign up first).
 */
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import {
  hausInviteUrl,
  parseInviteCode,
  capturePendingInvite,
  takePendingInvite,
} from '../../utils/hausInvite';

const store: Record<string, string> = {};
const replaceState = jest.fn();

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  replaceState.mockClear();
  (global as any).window = {
    location: { origin: 'https://wearhaus.test', pathname: '/' },
    history: { replaceState },
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
  };
});

afterAll(() => { delete (global as any).window; });

describe('hausInviteUrl', () => {
  it("points at this site's /join/<code>", () => {
    expect(hausInviteUrl('abc123def456')).toBe('https://wearhaus.test/join/abc123def456');
  });
});

describe('parseInviteCode', () => {
  it('reads the code from a /join path', () => {
    expect(parseInviteCode('/join/abc123def456')).toBe('abc123def456');
    expect(parseInviteCode('/join/abc123def456/')).toBe('abc123def456');
  });

  it('ignores other paths', () => {
    expect(parseInviteCode('/')).toBeNull();
    expect(parseInviteCode('/join/')).toBeNull();
    expect(parseInviteCode('/join/abc/extra')).toBeNull();
    expect(parseInviteCode('/hauses/abc')).toBeNull();
  });
});

describe('capturePendingInvite / takePendingInvite', () => {
  it('remembers the code from a /join URL, tidies the URL, and hands the code back once', () => {
    (global as any).window.location.pathname = '/join/abc123def456';
    capturePendingInvite();

    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(takePendingInvite()).toBe('abc123def456');
    expect(takePendingInvite()).toBeNull();
  });

  it('leaves a normal URL alone', () => {
    (global as any).window.location.pathname = '/';
    capturePendingInvite();

    expect(replaceState).not.toHaveBeenCalled();
    expect(takePendingInvite()).toBeNull();
  });

  it('still hands the code back when localStorage is blocked', () => {
    const blocked = () => { throw new Error('blocked'); };
    (global as any).window.localStorage = { getItem: blocked, setItem: blocked, removeItem: blocked };
    (global as any).window.location.pathname = '/join/abc123def456';
    capturePendingInvite();

    expect(takePendingInvite()).toBe('abc123def456');
  });
});
