import type React from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

// Shared by the real tab bar (AppTabs) and FooterTabBar, which draws the same bar on stack
// screens that sit on top of the tabs (Borrows dashboard, Messages, exchange detail).

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const TAB_NAMES = ['Home', 'Explore', 'Closet', 'Profile'] as const;
export type TabName = typeof TAB_NAMES[number];

export const TAB_ICONS: Record<TabName, [filled: IconName, outline: IconName]> = {
  Home:    ['home',          'home-outline'],
  Explore: ['compass',       'compass-outline'],
  Closet:  ['shirt',         'shirt-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

export const TAB_ACTIVE_COLOR   = theme.colors.ink;
export const TAB_INACTIVE_COLOR = theme.colors.muted;

// On an installed PWA there's no browser chrome, so the iPhone home indicator sits right
// where the tab bar would otherwise end — pad past it instead of letting content hide under it.
export function tabBarStyle(bottomInset: number) {
  return {
    backgroundColor: theme.colors.ivory,
    borderTopColor: theme.colors.ivoryMid,
    borderTopWidth: 1.5,
    height: 88,
    paddingBottom: Math.max(bottomInset, 14),
    paddingTop: 8,
  };
}

export const tabBarLabelStyle = {
  fontFamily: theme.fonts.interRegular,
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};
