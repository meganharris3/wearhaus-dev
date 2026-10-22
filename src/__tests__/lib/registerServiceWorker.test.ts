/**
 * Tests for registerServiceWorker — must only ever register on web, in production, when the
 * browser supports it. Getting any of these wrong either breaks native builds (there is no
 * navigator.serviceWorker there) or registers a caching service worker in dev, where it would
 * serve stale bundles across reloads.
 */
import { Platform } from 'react-native';
import { registerServiceWorker } from '../../lib/registerServiceWorker';

const originalNodeEnv = process.env.NODE_ENV;
const originalNavigator = (globalThis as any).navigator;
const originalWindow = (globalThis as any).window;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  (globalThis as any).navigator = originalNavigator;
  (globalThis as any).window = originalWindow;
  jest.restoreAllMocks();
});

describe('registerServiceWorker', () => {
  it('does nothing on native (Platform.OS !== web)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    process.env.NODE_ENV = 'production';
    const addEventListener = jest.fn();
    (globalThis as any).window = { addEventListener };
    (globalThis as any).navigator = { serviceWorker: { register: jest.fn() } };

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no serviceWorker support', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    process.env.NODE_ENV = 'production';
    const addEventListener = jest.fn();
    (globalThis as any).window = { addEventListener };
    (globalThis as any).navigator = {}; // no serviceWorker property

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing outside production (e.g. the dev server)', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    process.env.NODE_ENV = 'development';
    const addEventListener = jest.fn();
    (globalThis as any).window = { addEventListener };
    (globalThis as any).navigator = { serviceWorker: { register: jest.fn() } };

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('registers /sw.js at the root scope, after window load, on web in production', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    process.env.NODE_ENV = 'production';
    const register = jest.fn().mockResolvedValue(undefined);
    let loadHandler: (() => void) | undefined;
    (globalThis as any).window = {
      addEventListener: (event: string, handler: () => void) => { if (event === 'load') loadHandler = handler; },
    };
    (globalThis as any).navigator = { serviceWorker: { register } };

    registerServiceWorker();
    expect(register).not.toHaveBeenCalled(); // not yet — waits for the load event

    loadHandler?.();

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('does not throw if registration rejects', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    process.env.NODE_ENV = 'production';
    const register = jest.fn().mockRejectedValue(new Error('nope'));
    let loadHandler: (() => void) | undefined;
    (globalThis as any).window = {
      addEventListener: (event: string, handler: () => void) => { if (event === 'load') loadHandler = handler; },
    };
    (globalThis as any).navigator = { serviceWorker: { register } };

    registerServiceWorker();
    expect(() => loadHandler?.()).not.toThrow();
  });
});
