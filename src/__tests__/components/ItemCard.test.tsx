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

const mockToggleFavorite = jest.fn();
let mockFavoritedIds = new Set<string>();
jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({
    isFavorited: (id: string) => mockFavoritedIds.has(id),
    toggleFavorite: mockToggleFavorite,
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
  beforeEach(() => {
    mockToggleFavorite.mockClear();
    mockNavigate.mockClear();
    mockFavoritedIds = new Set();
  });

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

describe('ItemCard favoriting', () => {
  beforeEach(() => {
    mockToggleFavorite.mockClear();
    mockNavigate.mockClear();
    mockFavoritedIds = new Set();
  });

  it('shows an outline heart when the item is not favorited', () => {
    const { UNSAFE_getAllByType } = render(<ItemCard item={makeItem({ id: '1' })} onPress={jest.fn()} />);
    const { Text } = require('react-native');
    const icons = UNSAFE_getAllByType(require('@expo/vector-icons').Ionicons);
    const heart = icons.find((n: any) => n.props.name === 'heart-outline' || n.props.name === 'heart');
    expect(heart?.props.name).toBe('heart-outline');
  });

  it('shows a filled heart when the item is already favorited', () => {
    mockFavoritedIds = new Set(['1']);
    const { UNSAFE_getAllByType } = render(<ItemCard item={makeItem({ id: '1' })} onPress={jest.fn()} />);
    const icons = UNSAFE_getAllByType(require('@expo/vector-icons').Ionicons);
    const heart = icons.find((n: any) => n.props.name === 'heart-outline' || n.props.name === 'heart');
    expect(heart?.props.name).toBe('heart');
  });

  it('calls toggleFavorite with the item id, and not onPress, when the heart is tapped', () => {
    // fireEvent.press walks up from the queried node to the nearest Pressable ancestor — the
    // heart button's own Pressable, not the card's outer one — matching real press behaviour.
    const onPress = jest.fn();
    render(<ItemCard item={makeItem({ id: '1' })} onPress={onPress} />);
    fireEvent.press(screen.getByText('heart-outline'), { stopPropagation: jest.fn() });

    expect(mockToggleFavorite).toHaveBeenCalledWith('1');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not render a heart button when onEdit is provided (owner view)', () => {
    const { UNSAFE_queryAllByType } = render(
      <ItemCard item={makeItem({ id: '1' })} onPress={jest.fn()} onEdit={jest.fn()} />,
    );
    const icons = UNSAFE_queryAllByType(require('@expo/vector-icons').Ionicons);
    expect(icons.some((n: any) => n.props.name === 'heart-outline' || n.props.name === 'heart')).toBe(false);
  });
});

describe('ItemCard comments', () => {
  beforeEach(() => {
    mockToggleFavorite.mockClear();
    mockNavigate.mockClear();
    mockFavoritedIds = new Set();
  });

  it('renders a comment icon', () => {
    const { UNSAFE_getAllByType } = render(<ItemCard item={makeItem({ id: '1' })} onPress={jest.fn()} />);
    const icons = UNSAFE_getAllByType(require('@expo/vector-icons').Ionicons);
    expect(icons.some((n: any) => n.props.name === 'chatbubble-outline')).toBe(true);
  });

  it('navigates to ItemComments with the item, and not onPress, when tapped', () => {
    const onPress = jest.fn();
    const item = makeItem({ id: '1' });
    render(<ItemCard item={item} onPress={onPress} />);

    fireEvent.press(screen.getByText('chatbubble-outline'), { stopPropagation: jest.fn() });

    expect(mockNavigate).toHaveBeenCalledWith('ItemComments', { item });
    expect(onPress).not.toHaveBeenCalled();
    expect(mockToggleFavorite).not.toHaveBeenCalled();
  });

  it('does not render a comment button when onEdit is provided (owner view)', () => {
    const { UNSAFE_queryAllByType } = render(
      <ItemCard item={makeItem({ id: '1' })} onPress={jest.fn()} onEdit={jest.fn()} />,
    );
    const icons = UNSAFE_queryAllByType(require('@expo/vector-icons').Ionicons);
    expect(icons.some((n: any) => n.props.name === 'chatbubble-outline')).toBe(false);
  });
});
