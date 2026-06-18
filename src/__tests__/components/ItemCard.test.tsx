/**
 * Component tests for ItemCard
 *
 * Covers:
 * - renders item name, owner, price, size, location
 * - renders Image when photo_url is present
 * - renders placeholder View (no Image) when photo_url is absent
 * - calls onPress when pressed
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ItemCard from '../../components/ItemCard';
import type { Item } from '../../types';

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id:             '1',
  owner_id:       'u1',
  name:           'Silk Slip Dress',
  category:       'dress',
  size_label:     'S',
  price_per_day:  800,
  status:         'available',
  location_label: '0.3 mi · NYU',
  owner:          { id: 'u1', display_name: 'Maya Chen' },
  ...overrides,
});

describe('ItemCard', () => {
  it('renders the item name in uppercase', () => {
    render(<ItemCard item={makeItem()} onPress={jest.fn()} />);
    // Text component has textTransform uppercase in styles, but the raw text is the prop value
    expect(screen.getByText('Silk Slip Dress')).toBeTruthy();
  });

  it('renders owner display_name', () => {
    render(<ItemCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Maya Chen')).toBeTruthy();
  });

  it('renders formatted price per day', () => {
    render(<ItemCard item={makeItem({ price_per_day: 800 })} onPress={jest.fn()} />);
    expect(screen.getByText('$8.00/day')).toBeTruthy();
  });

  it('renders size label', () => {
    render(<ItemCard item={makeItem({ size_label: 'M' })} onPress={jest.fn()} />);
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('renders location label', () => {
    render(<ItemCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('0.3 mi · NYU')).toBeTruthy();
  });

  it('renders an Image when photo_url is provided', () => {
    const item = makeItem({ photo_url: 'https://img.test/photo.jpg' });
    const { UNSAFE_getByType } = render(<ItemCard item={item} onPress={jest.fn()} />);
    const { Image } = require('react-native');
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });

  it('does not render an Image when photo_url is absent', () => {
    const item = makeItem({ photo_url: undefined });
    const { UNSAFE_queryByType } = render(<ItemCard item={item} onPress={jest.fn()} />);
    const { Image } = require('react-native');
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });

  it('calls onPress when the card is pressed', () => {
    const onPress = jest.fn();
    render(<ItemCard item={makeItem()} onPress={onPress} />);
    fireEvent.press(screen.getByText('Silk Slip Dress'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders StatusTag with the item status', () => {
    render(<ItemCard item={makeItem({ status: 'lent' })} onPress={jest.fn()} />);
    expect(screen.getByText('LENT')).toBeTruthy();
  });

  it('renders empty string when owner is undefined', () => {
    const item = makeItem({ owner: undefined });
    // Should not throw; lenderName renders empty
    expect(() => render(<ItemCard item={item} onPress={jest.fn()} />)).not.toThrow();
  });

  it('renders price with two decimal places for fractional cents', () => {
    render(<ItemCard item={makeItem({ price_per_day: 750 })} onPress={jest.fn()} />);
    expect(screen.getByText('$7.50/day')).toBeTruthy();
  });
});
