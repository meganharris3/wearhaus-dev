/**
 * Tests for ExploreScreen
 *
 * Covers:
 * - renders the search bar
 * - renders Masthead with "The Edit" subtitle
 * - renders filter chips
 * - shows all 6 mock items when search is empty
 * - filters items by name when a query is typed
 * - shows "NO PIECES FOUND" when no items match the query
 * - shows result count text
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  NavigationProp: {},
}));

import ExploreScreen from '../../screens/explore/ExploreScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

function renderScreen() {
  return render(<ExploreScreen />);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
describe('ExploreScreen render', () => {
  it('renders the Masthead with "The Edit" subtitle', () => {
    renderScreen();
    expect(screen.getByText('The Edit')).toBeTruthy();
  });

  it('renders the search bar with correct placeholder', () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );
    expect(searchInput).toBeTruthy();
  });

  it('renders filter chips (Size, Colour, Style, Event, Price)', () => {
    renderScreen();
    expect(screen.getByText('SIZE ▾')).toBeTruthy();
    expect(screen.getByText('COLOUR ▾')).toBeTruthy();
    expect(screen.getByText('STYLE ▾')).toBeTruthy();
    expect(screen.getByText('EVENT ▾')).toBeTruthy();
    expect(screen.getByText('PRICE ▾')).toBeTruthy();
  });

  it('renders the results count', () => {
    renderScreen();
    // With empty search all 6 items are shown
    expect(screen.getByText('6 PIECES')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Items display
// ---------------------------------------------------------------------------
describe('ExploreScreen items', () => {
  it('renders all 6 mock items initially', () => {
    renderScreen();
    expect(screen.getByText('Silk Slip Dress')).toBeTruthy();
    expect(screen.getByText('Black Blazer')).toBeTruthy();
    expect(screen.getByText('Festival Cowboy Boots')).toBeTruthy();
    expect(screen.getByText('Sequin Mini Skirt')).toBeTruthy();
    expect(screen.getByText('Velvet Blazer')).toBeTruthy();
    expect(screen.getByText('Emerald Gown')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Search / filter behaviour
// ---------------------------------------------------------------------------
describe('ExploreScreen search', () => {
  function getSearchInput() {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    return inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );
  }

  it('filters items by name when query is typed', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );

    fireEvent.changeText(searchInput, 'blazer');

    await waitFor(() => {
      // "Black Blazer" and "Velvet Blazer" both contain "blazer"
      expect(screen.getByText('Black Blazer')).toBeTruthy();
      expect(screen.getByText('Velvet Blazer')).toBeTruthy();
    });

    // Non-matching items should not appear
    expect(screen.queryByText('Silk Slip Dress')).toBeNull();
    expect(screen.queryByText('Emerald Gown')).toBeNull();
  });

  it('is case-insensitive when filtering', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );

    fireEvent.changeText(searchInput, 'BLAZER');

    await waitFor(() => {
      expect(screen.getByText('Black Blazer')).toBeTruthy();
    });
  });

  it('shows "NO PIECES FOUND" when no items match the query', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );

    fireEvent.changeText(searchInput, 'xyznonexistent');

    await waitFor(() => {
      expect(screen.getByText('NO PIECES FOUND')).toBeTruthy();
    });
  });

  it('updates results count when filtering', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );

    fireEvent.changeText(searchInput, 'Dress');

    await waitFor(() => {
      // "Silk Slip Dress" matches, "Sequin Mini Skirt" does not, etc.
      // Only "Silk Slip Dress" contains "Dress" (case-insensitive check against our data)
      expect(screen.getByText('1 PIECES')).toBeTruthy();
    });
  });

  it('restores all items when query is cleared', async () => {
    const { UNSAFE_getAllByType } = renderScreen();
    const { TextInput } = require('react-native');
    const inputs = UNSAFE_getAllByType(TextInput);
    const searchInput = inputs.find(
      (i: any) => i.props.placeholder === 'Search size, style, occasion…'
    );

    fireEvent.changeText(searchInput, 'blazer');
    fireEvent.changeText(searchInput, '');

    await waitFor(() => {
      expect(screen.getByText('6 PIECES')).toBeTruthy();
    });
  });
});
