/**
 * Component tests for CommentThread
 *
 * Covers:
 * - empty state
 * - renders top-level comments and their nested replies (via groupCommentsIntoThreads)
 * - Reply is offered on a top-level comment, not on a reply
 * - tapping Reply reveals a composer; submitting calls onReply(parentId, text) and closes it
 * - a failed reply shows an alert and keeps the typed text
 * - does not submit an empty/whitespace reply
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import CommentThread from '../../components/CommentThread';
import type { Comment } from '../../types';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  itemId: 'i1',
  authorId: 'u1',
  authorName: 'Maya Chen',
  text: 'Is this still available?',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

let alertSpy: jest.SpyInstance;
beforeEach(() => { alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => alertSpy.mockRestore());

describe('CommentThread empty state', () => {
  it('shows the empty label when there are no comments', () => {
    render(<CommentThread comments={[]} onReply={jest.fn()} />);
    expect(screen.getByText('No comments yet. Be the first!')).toBeTruthy();
  });

  it('honours a custom empty label', () => {
    render(<CommentThread comments={[]} onReply={jest.fn()} emptyLabel="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});

describe('CommentThread rendering', () => {
  it('renders a top-level comment with author and text', () => {
    render(<CommentThread comments={[makeComment()]} onReply={jest.fn()} />);
    expect(screen.getByText('Maya Chen')).toBeTruthy();
    expect(screen.getByText('Is this still available?')).toBeTruthy();
  });

  it('renders a reply nested under its parent', () => {
    const top = makeComment({ id: 'top', authorName: 'Maya Chen', text: 'Is this still available?' });
    const reply = makeComment({ id: 'r1', parentCommentId: 'top', authorName: 'Jo Park', text: 'Yes!' });

    render(<CommentThread comments={[top, reply]} onReply={jest.fn()} />);

    expect(screen.getByText('Maya Chen')).toBeTruthy();
    expect(screen.getByText('Jo Park')).toBeTruthy();
    expect(screen.getByText('Yes!')).toBeTruthy();
  });

  it('offers Reply on a top-level comment but not on a reply', () => {
    const top = makeComment({ id: 'top' });
    const reply = makeComment({ id: 'r1', parentCommentId: 'top', authorName: 'Jo Park' });

    render(<CommentThread comments={[top, reply]} onReply={jest.fn()} />);

    expect(screen.getAllByText('Reply')).toHaveLength(1);
  });
});

describe('CommentThread replying', () => {
  it('reveals a composer when Reply is tapped, hidden before that', () => {
    render(<CommentThread comments={[makeComment({ id: 'top' })]} onReply={jest.fn()} />);

    expect(screen.queryByPlaceholderText('Write a reply…')).toBeNull();

    fireEvent.press(screen.getByText('Reply'));

    expect(screen.getByPlaceholderText('Write a reply…')).toBeTruthy();
  });

  it('submits the reply to the right parent and closes the composer', async () => {
    const onReply = jest.fn().mockResolvedValue(undefined);
    render(<CommentThread comments={[makeComment({ id: 'top' })]} onReply={onReply} />);

    fireEvent.press(screen.getByText('Reply'));
    fireEvent.changeText(screen.getByPlaceholderText('Write a reply…'), 'Thanks for asking!');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Write a reply…'), 'submitEditing'); });

    expect(onReply).toHaveBeenCalledWith('top', 'Thanks for asking!');
    expect(screen.queryByPlaceholderText('Write a reply…')).toBeNull();
  });

  it('does not submit a blank reply', async () => {
    const onReply = jest.fn();
    render(<CommentThread comments={[makeComment({ id: 'top' })]} onReply={onReply} />);

    fireEvent.press(screen.getByText('Reply'));
    fireEvent.changeText(screen.getByPlaceholderText('Write a reply…'), '   ');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Write a reply…'), 'submitEditing'); });

    expect(onReply).not.toHaveBeenCalled();
  });

  it('shows an alert and keeps the text when the reply fails to post', async () => {
    const onReply = jest.fn().mockRejectedValue(new Error('network'));
    render(<CommentThread comments={[makeComment({ id: 'top' })]} onReply={onReply} />);

    fireEvent.press(screen.getByText('Reply'));
    fireEvent.changeText(screen.getByPlaceholderText('Write a reply…'), 'Thanks!');
    await act(async () => { fireEvent(screen.getByPlaceholderText('Write a reply…'), 'submitEditing'); });

    expect(alertSpy).toHaveBeenCalledWith('Could not post reply', 'network');
    expect(screen.getByPlaceholderText('Write a reply…').props.value).toBe('Thanks!');
  });

  it('tapping Reply again hides the composer', () => {
    render(<CommentThread comments={[makeComment({ id: 'top' })]} onReply={jest.fn()} />);

    fireEvent.press(screen.getByText('Reply'));
    expect(screen.getByPlaceholderText('Write a reply…')).toBeTruthy();

    fireEvent.press(screen.getByText('Reply'));
    expect(screen.queryByPlaceholderText('Write a reply…')).toBeNull();
  });
});
