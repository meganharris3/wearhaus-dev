import type { Comment } from '../types';

export interface CommentThreadGroup {
  comment: Comment;
  replies: Comment[];
}

/**
 * Groups a flat, oldest-first comment list (as fetchComments returns it) into one level of
 * nesting: each top-level comment with its replies, oldest first, threads in their original order.
 *
 * The app only ever lets someone reply to a top-level comment, never to another reply, so a
 * normal list has no chains. This still handles the edge cases a flat `parent_comment_id`
 * column allows, so nothing is ever silently dropped from the thread:
 * - a reply-to-a-reply collapses onto its outermost ancestor
 * - a reply whose parent is missing (e.g. the parent was deleted) becomes its own thread
 * - a cycle in malformed data anchors on whichever comment is hit twice, instead of looping forever
 */
export function groupCommentsIntoThreads(comments: Comment[]): CommentThreadGroup[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const originalIndex = new Map(comments.map((c, i) => [c.id, i]));

  // Pass 1: for every comment, resolve which comment's thread it belongs under (itself, if it
  // heads a thread). One combined walk-and-memoize pass handles chains without revisiting work.
  const rootIdOf = new Map<string, string>();
  for (const start of comments) {
    if (rootIdOf.has(start.id)) continue;

    const path: string[] = [];
    const onThisWalk = new Set<string>();
    let current: Comment = start;
    let root: string;

    while (true) {
      if (rootIdOf.has(current.id)) { root = rootIdOf.get(current.id)!; break; }
      if (onThisWalk.has(current.id)) { root = current.id; break; } // cycle — anchor here
      if (!current.parentCommentId || !byId.has(current.parentCommentId)) { root = current.id; break; }
      path.push(current.id);
      onThisWalk.add(current.id);
      current = byId.get(current.parentCommentId)!;
    }
    for (const id of path) rootIdOf.set(id, root);
    rootIdOf.set(current.id, root);
  }

  // Pass 2: bucket every comment under its resolved root, in original order.
  const groups = new Map<string, CommentThreadGroup>();
  for (const c of comments) {
    const rootId = rootIdOf.get(c.id)!;
    if (!groups.has(rootId)) groups.set(rootId, { comment: byId.get(rootId)!, replies: [] });
    if (c.id !== rootId) groups.get(rootId)!.replies.push(c);
  }

  return [...groups.values()]
    .sort((a, b) => originalIndex.get(a.comment.id)! - originalIndex.get(b.comment.id)!)
    .map((group) => ({
      ...group,
      replies: [...group.replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }));
}
