/**
 * Tests for the app-wide action confirmation ("✓ Request sent") — shown after a request /
 * accept / list action succeeds, and gone again on its own.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name) };
});

import { ConfirmationProvider, useConfirmation } from '../../context/ConfirmationContext';

let confirm: (m: string) => void;
function Capture() {
  confirm = useConfirmation();
  return <Text>screen</Text>;
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('shows the confirmation, then removes it on its own', () => {
  render(<ConfirmationProvider><Capture /></ConfirmationProvider>);
  expect(screen.queryByText('Request sent')).toBeNull();

  act(() => { confirm('Request sent'); });
  expect(screen.getByText('Request sent')).toBeTruthy();
  expect(screen.getByText('checkmark')).toBeTruthy();

  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.queryByText('Request sent')).toBeNull();
});

it('a second confirmation replaces the first', () => {
  render(<ConfirmationProvider><Capture /></ConfirmationProvider>);
  act(() => { confirm('Request sent'); });
  act(() => { confirm('Offer accepted'); });
  expect(screen.queryByText('Request sent')).toBeNull();
  expect(screen.getByText('Offer accepted')).toBeTruthy();
});

it('is a harmless no-op without a provider', () => {
  render(<Capture />);
  expect(() => confirm('Request sent')).not.toThrow();
});
