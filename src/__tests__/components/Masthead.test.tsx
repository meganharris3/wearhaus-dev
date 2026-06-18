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
import Masthead from '../../components/Masthead';

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
});
