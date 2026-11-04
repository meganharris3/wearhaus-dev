/**
 * Tests for FooterTabBar — the tab bar drawn on stack screens that cover the real one
 * (Borrows dashboard, Messages, exchange detail), so the footer doesn't vanish on them.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name) };
});

import FooterTabBar from '../../components/FooterTabBar';

beforeEach(() => { jest.clearAllMocks(); });

it('shows every tab', () => {
  render(<FooterTabBar />);
  for (const name of ['Home', 'Explore', 'Closet', 'Profile']) {
    expect(screen.getByText(name)).toBeTruthy();
  }
});

it('jumps to the tapped tab', () => {
  render(<FooterTabBar />);
  fireEvent.press(screen.getByText('Closet'));
  expect(mockNavigate).toHaveBeenCalledWith('Tabs', { screen: 'Closet' });
});

it('highlights the tab the screen belongs under', () => {
  render(<FooterTabBar active="Profile" />);
  expect(screen.getByText('person-circle')).toBeTruthy();   // filled icon
  expect(screen.getByText('home-outline')).toBeTruthy();    // others stay outlined
  expect(screen.getByLabelText('Profile').props.accessibilityState).toEqual({ selected: true });
});
