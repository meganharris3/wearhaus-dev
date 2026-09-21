import { Alert, Platform } from 'react-native';
import { showWebAlert, installWebAlert, type DialogEnv } from '../../lib/webAlert';

/** A fake browser: records what was shown and answers confirm/prompt as configured. */
function makeEnv(answers: { confirm?: boolean; prompt?: string | null } = {}) {
  const env = {
    alert: jest.fn(),
    confirm: jest.fn(() => answers.confirm ?? true),
    prompt: jest.fn(() => (answers.prompt === undefined ? null : answers.prompt)),
  };
  return env as typeof env & DialogEnv;
}

describe('showWebAlert', () => {
  it('shows title and message in a plain alert when there are no buttons', () => {
    const env = makeEnv();
    showWebAlert('Save failed', 'That username is taken.', undefined, env);

    expect(env.alert).toHaveBeenCalledWith('Save failed\n\nThat username is taken.');
    expect(env.confirm).not.toHaveBeenCalled();
  });

  it('shows just the title when there is no message', () => {
    const env = makeEnv();
    showWebAlert('Name required', undefined, undefined, env);
    expect(env.alert).toHaveBeenCalledWith('Name required');
  });

  it('runs the onPress of a single button after the alert is dismissed', () => {
    const env = makeEnv();
    const onPress = jest.fn();
    showWebAlert('Done', 'Saved', [{ text: 'OK', onPress }], env);

    expect(env.alert).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when buttons have no onPress', () => {
    const env = makeEnv();
    expect(() => showWebAlert('Hi', 'there', [{ text: 'OK' }], env)).not.toThrow();
  });

  describe('a cancel button plus one action (a confirmation)', () => {
    const buttons = () => {
      const cancel = jest.fn();
      const del = jest.fn();
      return {
        cancel, del,
        list: [
          { text: 'Cancel', style: 'cancel' as const, onPress: cancel },
          { text: 'Delete', style: 'destructive' as const, onPress: del },
        ],
      };
    };

    it('runs the action when the user confirms', () => {
      const env = makeEnv({ confirm: true });
      const b = buttons();
      showWebAlert('Delete board?', 'This is permanent.', b.list, env);

      expect(env.confirm).toHaveBeenCalledWith('Delete board?\n\nThis is permanent.');
      expect(b.del).toHaveBeenCalledTimes(1);
      expect(b.cancel).not.toHaveBeenCalled();
    });

    it('runs cancel when the user declines', () => {
      const env = makeEnv({ confirm: false });
      const b = buttons();
      showWebAlert('Delete board?', undefined, b.list, env);

      expect(b.cancel).toHaveBeenCalledTimes(1);
      expect(b.del).not.toHaveBeenCalled();
    });

    it('does not depend on button order', () => {
      const env = makeEnv({ confirm: true });
      const del = jest.fn();
      showWebAlert('Sure?', undefined, [
        { text: 'Delete', onPress: del },
        { text: 'Cancel', style: 'cancel' },
      ], env);
      expect(del).toHaveBeenCalledTimes(1);
    });
  });

  it('with only a cancel button, shows an alert and runs it', () => {
    const env = makeEnv();
    const cancel = jest.fn();
    showWebAlert('FYI', 'Nothing to do', [{ text: 'Close', style: 'cancel', onPress: cancel }], env);

    expect(env.alert).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  describe('several actions (a menu)', () => {
    const menu = () => {
      const a = jest.fn(); const b = jest.fn(); const cancel = jest.fn();
      return {
        a, b, cancel,
        list: [
          { text: 'Summer', onPress: a },
          { text: 'Festival', onPress: b },
          { text: 'Cancel', style: 'cancel' as const, onPress: cancel },
        ],
      };
    };

    it('lists the choices by number and runs the one that was entered', () => {
      const env = makeEnv({ prompt: '2' });
      const m = menu();
      showWebAlert('Move to board', 'Choose a destination:', m.list, env);

      const shown = (env.prompt.mock.calls[0] as unknown as string[])[0];
      expect(shown).toContain('Move to board');
      expect(shown).toContain('1. Summer');
      expect(shown).toContain('2. Festival');
      expect(shown).not.toContain('Cancel');
      expect(m.b).toHaveBeenCalledTimes(1);
      expect(m.a).not.toHaveBeenCalled();
    });

    it.each([[null], [''], ['0'], ['3'], ['abc']])('runs cancel (nothing else) for input %p', (input) => {
      const env = makeEnv({ prompt: input });
      const m = menu();
      showWebAlert('Move to board', undefined, m.list, env);

      expect(m.a).not.toHaveBeenCalled();
      expect(m.b).not.toHaveBeenCalled();
      expect(m.cancel).toHaveBeenCalledTimes(1);
    });
  });
});

describe('installWebAlert', () => {
  const original = Alert.alert;
  const g = globalThis as any;
  let saved: Record<string, unknown>;

  beforeEach(() => {
    saved = { alert: g.alert, confirm: g.confirm, prompt: g.prompt };
    g.alert = jest.fn();
    g.confirm = jest.fn(() => true);
    g.prompt = jest.fn(() => null);
  });

  afterEach(() => {
    Alert.alert = original;
    Object.assign(g, saved);
    jest.restoreAllMocks();
  });

  it('routes Alert.alert to the browser dialogs on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    installWebAlert();

    Alert.alert('Save failed', 'Try again');

    expect(g.alert).toHaveBeenCalledWith('Save failed\n\nTry again');
  });

  it('leaves the native Alert alone on iOS and Android', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    installWebAlert();

    expect(Alert.alert).toBe(original);
  });
});
