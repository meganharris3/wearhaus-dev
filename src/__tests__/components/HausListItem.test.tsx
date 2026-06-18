/**
 * Component tests for HausListItem
 *
 * Covers:
 * - renders haus name in uppercase
 * - renders member_count and piece_count in meta line
 * - renders avatar initials from haus name words
 * - calls onPress when the row is pressed
 * - calls onPress when the VIEW button is pressed
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HausListItem from '../../components/HausListItem';
import type { Haus } from '../../types';

const makeHaus = (overrides: Partial<Haus> = {}): Haus => ({
  id:           'h1',
  name:         'Style Queens',
  member_count: 4,
  piece_count:  12,
  ...overrides,
});

describe('HausListItem', () => {
  it('renders the haus name', () => {
    render(<HausListItem haus={makeHaus()} onPress={jest.fn()} />);
    expect(screen.getByText('STYLE QUEENS')).toBeTruthy();
  });

  it('renders member count and piece count', () => {
    render(<HausListItem haus={makeHaus({ member_count: 7, piece_count: 20 })} onPress={jest.fn()} />);
    expect(screen.getByText('7 members · 20 pieces')).toBeTruthy();
  });

  it('renders a "VIEW" button', () => {
    render(<HausListItem haus={makeHaus()} onPress={jest.fn()} />);
    expect(screen.getByText('VIEW')).toBeTruthy();
  });

  it('calls onPress when the row container is pressed', () => {
    const onPress = jest.fn();
    render(<HausListItem haus={makeHaus()} onPress={onPress} />);
    // Press on the haus name (inside the outer Pressable)
    fireEvent.press(screen.getByText('STYLE QUEENS'));
    expect(onPress).toHaveBeenCalled();
  });

  it('calls onPress when the VIEW button is pressed', () => {
    const onPress = jest.fn();
    render(<HausListItem haus={makeHaus()} onPress={onPress} />);
    fireEvent.press(screen.getByText('VIEW'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders avatar initials for each word in the haus name (up to 3)', () => {
    // "Style Queens" => words ["Style", "Queens"] => initials "S", "Q"
    render(<HausListItem haus={makeHaus({ name: 'Style Queens' })} onPress={jest.fn()} />);
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('Q')).toBeTruthy();
  });

  it('caps avatar stack at 3 initials even for longer haus names', () => {
    render(
      <HausListItem
        haus={makeHaus({ name: 'NYU Fashion Collective Extra' })}
        onPress={jest.fn()}
      />
    );
    // Only first 3 words: "N", "F", "C"
    expect(screen.getByText('N')).toBeTruthy();
    expect(screen.getByText('F')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.queryByText('E')).toBeNull();
  });
});
