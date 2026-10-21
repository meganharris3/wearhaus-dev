/**
 * Tests for ItemCommentsScreen (the modal reached from an ItemCard's comment icon)
 *
 * Covers:
 * - shows the item name
 * - loads comments for the item on mount
 * - renders the loaded comments
 * - posting from the bottom composer adds a top-level comment (no parent)
 * - replying (via CommentThread) adds a comment with that parent
 * - the close button navigates back
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockGoBack = jest.fn();
let mockItem: any;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { item: mockItem } }),
}));

const mockLoadComments = jest.fn();
const mockAddComment = jest.fn();
let mockComments: any[] = [];
jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({
    getComments: () => mockComments,
    loadComments: mockLoadComments,
    addComment: mockAddComment,
  }),
}));

import ItemCommentsScreen from '../../screens/item/ItemCommentsScreen';

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockItem = { id: 'i1', owner_id: 'u2', name: 'Denim Jacket', category: 'jacket', size_label: 'M', price_per_day: 1200, status: 'available', location_label: 'NYU' };
  mockComments = [];
  mockLoadComments.mockResolvedValue(undefined);
  mockAddComment.mockResolvedValue(undefined);
});

describe('ItemCommentsScreen', () => {
  it('shows the item name', async () => {
    render(<ItemCommentsScreen />);
    await settle();
    expect(screen.getByText('Denim Jacket')).toBeTruthy();
  });

  it('loads comments for this item on mount', async () => {
    render(<ItemCommentsScreen />);
    await settle();
    expect(mockLoadComments).toHaveBeenCalledWith('i1');
  });

  it('renders the loaded comments', async () => {
    mockComments = [
      { id: 'c1', itemId: 'i1', authorId: 'u3', authorName: 'Jo Park', text: 'Still available?', createdAt: '2026-01-01T00:00:00Z' },
    ];
    render(<ItemCommentsScreen />);
    await settle();
    expect(screen.getByText('Jo Park')).toBeTruthy();
    expect(screen.getByText('Still available?')).toBeTruthy();
  });

  it('posts a new top-level comment from the bottom composer', async () => {
    render(<ItemCommentsScreen />);
    await settle();

    fireEvent.changeText(screen.getByPlaceholderText('Add a comment…'), 'Love this!');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Add a comment…'), 'submitEditing'); });

    expect(mockAddComment).toHaveBeenCalledWith('i1', 'Love this!');
  });

  it('replying to a comment adds a comment with that parent id', async () => {
    mockComments = [
      { id: 'c1', itemId: 'i1', authorId: 'u3', authorName: 'Jo Park', text: 'Still available?', createdAt: '2026-01-01T00:00:00Z' },
    ];
    render(<ItemCommentsScreen />);
    await settle();

    fireEvent.press(screen.getByText('Reply'));
    fireEvent.changeText(screen.getByPlaceholderText('Write a reply…'), 'Yes!');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Write a reply…'), 'submitEditing'); });

    expect(mockAddComment).toHaveBeenCalledWith('i1', 'Yes!', 'c1');
  });

  it('closing navigates back', async () => {
    render(<ItemCommentsScreen />);
    await settle();
    fireEvent.press(screen.getByText('close'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
