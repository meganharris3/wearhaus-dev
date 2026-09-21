import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * React Native Web ships `Alert.alert` as an empty function, so on web every
 * error message, validation notice and confirmation in the app is silently
 * dropped — a failed save just looks like "nothing happened", and a "Delete?"
 * confirmation can never be answered. This maps it onto the browser's dialogs.
 *
 * - no buttons / one button  -> alert(), then the button's onPress
 * - one action + a cancel    -> confirm(): OK runs the action, Cancel runs cancel
 * - several actions          -> a numbered prompt(): pick one, anything else cancels
 */

/** The three browser dialogs, injectable so this can be tested without a browser. */
export interface DialogEnv {
  alert(message: string): void;
  confirm(message: string): boolean;
  prompt(message: string): string | null;
}

function browserEnv(): DialogEnv {
  const g = globalThis as any;
  return {
    alert: (m) => g.alert?.(m),
    confirm: (m) => g.confirm?.(m) ?? false, // no dialog available: decline rather than run a destructive action
    prompt: (m) => g.prompt?.(m) ?? null,
  };
}

export function showWebAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  env: DialogEnv = browserEnv(),
): void {
  const text = [title, message].filter(Boolean).join('\n\n');
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');

  if (actions.length === 0) {
    env.alert(text);
    cancel?.onPress?.();
    return;
  }

  if (actions.length === 1 && !cancel) {
    env.alert(text);
    actions[0].onPress?.();
    return;
  }

  if (actions.length === 1) {
    if (env.confirm(text)) actions[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }

  const numbered = actions.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
  const answer = env.prompt(`${text}\n\n${numbered}\n\nEnter a number (or leave blank to cancel):`);
  const chosen = actions[Number.parseInt(answer ?? '', 10) - 1];
  if (chosen) chosen.onPress?.();
  else cancel?.onPress?.();
}

/** Replaces the no-op Alert.alert on web. Does nothing on iOS/Android. */
export function installWebAlert(): void {
  if (Platform.OS !== 'web') return;
  Alert.alert = (title, message, buttons) => showWebAlert(title, message, buttons);
}

installWebAlert();
