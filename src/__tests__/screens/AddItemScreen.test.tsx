/**
 * Tests for AddItemScreen's multi-select category/size behavior — the actual feature request
 * ("allow users to select multiple categories, sizes, and occasions"). Occasion was already
 * multi-select before this change; these tests cover category and size now matching it.
 *
 * Covers:
 * - tapping multiple category chips selects all of them, not just the last one
 * - tapping a selected chip again deselects just that one
 * - the same for size chips
 * - a custom category is added to the selection alongside the preset ones, not replacing them
 * - saving sends category/size_label to addItem as arrays
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: undefined }),
}));

const mockAddItem = jest.fn().mockResolvedValue(undefined);
jest.mock('../../context/ClosetContext', () => ({
  useCloset: () => ({ addItem: mockAddItem, updateItem: jest.fn() }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ hauses: [] }),
}));
jest.mock('../../services/storageService', () => ({
  uploadPhotos: jest.fn().mockResolvedValue(['https://example.com/photo.jpg']),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockConfirm = jest.fn();
jest.mock('../../context/ConfirmationContext', () => ({ useConfirmation: () => mockConfirm }));

import AddItemScreen from '../../screens/closet/AddItemScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockAddItem.mockResolvedValue(undefined);
});

describe('AddItemScreen category multi-select', () => {
  it('deselects a category chip on a second tap, leaving others selected', async () => {
    render(<AddItemScreen />);
    await act(async () => { fireEvent.press(screen.getByText('TOPS')); });
    await act(async () => { fireEvent.press(screen.getByText('OUTERWEAR')); });
    await act(async () => { fireEvent.press(screen.getByText('TOPS')); }); // deselect TOPS

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ category: ['Outerwear'] }),
    );
  });

  it('saves every selected category as an array', async () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('TOPS')); });
    await act(async () => { fireEvent.press(screen.getByText('OUTERWEAR')); });
    await act(async () => { fireEvent.press(screen.getByText('DRESSES')); });

    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ category: ['Tops', 'Outerwear', 'Dresses'] }),
    );
  });

  it('adds a custom category alongside existing preset selections, not instead of them', async () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('TOPS')); });

    fireEvent.changeText(screen.getByPlaceholderText('Add custom category…'), 'Swimwear');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Add custom category…'), 'submitEditing'); });

    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ category: ['Tops', 'Swimwear'] }),
    );
  });
});

describe('AddItemScreen size multi-select', () => {
  it('selects multiple sizes and saves them as an array', async () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('S')); });
    await act(async () => { fireEvent.press(screen.getByText('M')); });

    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ size_label: ['S', 'M'] }),
    );
  });

  it('deselects a size chip on a second tap, leaving others selected', async () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('S')); });
    await act(async () => { fireEvent.press(screen.getByText('M')); });
    await act(async () => { fireEvent.press(screen.getByText('S')); }); // deselect S

    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });

    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({ size_label: ['M'] }),
    );
  });
});

describe('AddItemScreen save confirmation', () => {
  it('confirms once the item is saved', async () => {
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });
    expect(mockConfirm).toHaveBeenCalledWith('Draft saved');
  });

  it('does not confirm when saving fails', async () => {
    mockAddItem.mockRejectedValueOnce(new Error('nope'));
    render(<AddItemScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Oversized Blazer'), 'My Item');
    await act(async () => { fireEvent.press(screen.getByText('SAVE AS DRAFT')); });
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
