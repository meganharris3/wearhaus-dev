/**
 * Component tests for Masthead
 *
 * Covers:
 * - always renders WEAR and HAUS wordmark segments
 * - renders subtitle when provided
 * - does not render subtitle element when prop is omitted
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Masthead renders NotificationBell and MessagesIcon, which read navigation and
// the Requests/Messages contexts. Mock those boundaries rather than mounting providers.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

let mockPendingCount = 0;
jest.mock('../../context/RequestsContext', () => ({
  useRequests: () => ({ pendingCount: mockPendingCount }),
}));

jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ unreadCount: 0 }),
}));

import Masthead from '../../components/Masthead';

beforeEach(() => {
  jest.clearAllMocks();
  mockPendingCount = 0;
});

describe('Masthead', () => {
  it('renders the "WEAR" text segment', () => {
    render(<Masthead />);
    expect(screen.getByText('WEAR')).toBeTruthy();
  });

  it('renders the " HAUS" text segment', () => {
    render(<Masthead />);
    expect(screen.getByText(' HAUS')).toBeTruthy();
  });

  it('renders the bell notification icon', () => {
    render(<Masthead />);
    // The Ionicons mock renders the icon name as text
    expect(screen.getByText('notifications-outline')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<Masthead subtitle="The Edit" />);
    expect(screen.getByText('The Edit')).toBeTruthy();
  });

  it('does not render a subtitle element when prop is omitted', () => {
    render(<Masthead />);
    expect(screen.queryByText('The Edit')).toBeNull();
  });

  it('does not render any subtitle element when subtitle is undefined', () => {
    const { toJSON } = render(<Masthead subtitle={undefined} />);
    const json = JSON.stringify(toJSON());
    // Subtitle text should not appear anywhere in the rendered output
    expect(json).not.toContain('"subtitle"');
  });

  it('renders different subtitle values correctly', () => {
    render(<Masthead subtitle="Near Campus" />);
    expect(screen.getByText('Near Campus')).toBeTruthy();
  });

  it('shows the pending request count on the bell when there are requests', () => {
    mockPendingCount = 3;
    render(<Masthead />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows no count badge when nothing is pending', () => {
    render(<Masthead />);
    expect(screen.queryByText('0')).toBeNull();
  });
});
