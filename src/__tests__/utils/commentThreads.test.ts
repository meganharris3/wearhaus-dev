import { groupCommentsIntoThreads } from '../../utils/commentThreads';
import type { Comment } from '../../types';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  itemId: 'i1',
  authorId: 'u1',
  authorName: 'Maya Chen',
  text: 'Love this!',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('groupCommentsIntoThreads', () => {
  it('returns an empty array for no comments', () => {
    expect(groupCommentsIntoThreads([])).toEqual([]);
  });

  it('treats every comment with no parent as its own thread, in order', () => {
    const a = makeComment({ id: 'a' });
    const b = makeComment({ id: 'b' });
    expect(groupCommentsIntoThreads([a, b])).toEqual([
      { comment: a, replies: [] },
      { comment: b, replies: [] },
    ]);
  });

  it('nests a reply under its parent comment', () => {
    const top = makeComment({ id: 'top', text: 'Is this still available?' });
    const reply = makeComment({ id: 'reply', text: 'Yes!', parentCommentId: 'top' });

    expect(groupCommentsIntoThreads([top, reply])).toEqual([
      { comment: top, replies: [reply] },
    ]);
  });

  it('collects several replies to the same comment, oldest first', () => {
    const top = makeComment({ id: 'top' });
    const reply2 = makeComment({ id: 'r2', parentCommentId: 'top', createdAt: '2026-01-02T00:00:00Z' });
    const reply1 = makeComment({ id: 'r1', parentCommentId: 'top', createdAt: '2026-01-01T12:00:00Z' });

    const result = groupCommentsIntoThreads([top, reply2, reply1]);

    expect(result).toEqual([{ comment: top, replies: [reply1, reply2] }]);
  });

  it('keeps separate threads separate', () => {
    const topA = makeComment({ id: 'topA' });
    const topB = makeComment({ id: 'topB' });
    const replyToA = makeComment({ id: 'r1', parentCommentId: 'topA' });

    const result = groupCommentsIntoThreads([topA, topB, replyToA]);

    expect(result).toEqual([
      { comment: topA, replies: [replyToA] },
      { comment: topB, replies: [] },
    ]);
  });

  it('collapses a reply-to-a-reply onto the outermost ancestor, so nothing is dropped', () => {
    const top = makeComment({ id: 'top' });
    const reply = makeComment({ id: 'reply', parentCommentId: 'top' });
    const replyToReply = makeComment({ id: 'reply2', parentCommentId: 'reply', createdAt: '2026-01-03T00:00:00Z' });

    const result = groupCommentsIntoThreads([top, reply, replyToReply]);

    expect(result).toEqual([{ comment: top, replies: [reply, replyToReply] }]);
  });

  it('treats a reply whose parent is missing (e.g. deleted) as its own top-level thread', () => {
    const orphan = makeComment({ id: 'orphan', parentCommentId: 'does-not-exist' });

    expect(groupCommentsIntoThreads([orphan])).toEqual([{ comment: orphan, replies: [] }]);
  });

  it('does not infinite-loop on a malformed cycle, and still surfaces every comment', () => {
    const a = makeComment({ id: 'a', parentCommentId: 'b' });
    const b = makeComment({ id: 'b', parentCommentId: 'a' });

    const result = groupCommentsIntoThreads([a, b]);
    const allComments = result.flatMap((t) => [t.comment, ...t.replies]);

    expect(allComments.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });
});
