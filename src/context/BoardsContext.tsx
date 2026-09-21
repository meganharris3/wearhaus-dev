import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchMyBoards, createBoard as createBoardRemote, updateBoard as updateBoardRemote,
  deleteBoard as deleteBoardRemote, addItemsToBoard as addItemsRemote,
  removeItemFromBoard as removeItemRemote, moveItemToBoard as moveItemRemote,
} from '../services/boardService';
import type { Board } from '../types';

interface BoardsContextValue {
  boards: Board[];
  isLoading: boolean;
  addBoard: (board: Pick<Board, 'name' | 'visibility' | 'coverStyle'>) => Promise<Board>;
  updateBoard: (board: Board) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  addItemsToBoard: (boardId: string, itemIds: string[]) => Promise<void>;
  removeItemFromBoard: (boardId: string, itemId: string) => Promise<void>;
  moveItemToBoard: (fromBoardId: string, toBoardId: string, itemId: string) => Promise<void>;
}

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) { setBoards([]); setLoading(false); return; }
      setLoading(true);
      try {
        const remote = await fetchMyBoards(user.id);
        if (!cancelled) setBoards(remote);
      } catch (e) {
        console.warn('Failed to load boards', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function addBoard(board: Pick<Board, 'name' | 'visibility' | 'coverStyle'>) {
    if (!user?.id) throw new Error('Not authenticated');
    const created = await createBoardRemote(user.id, board.name, board.visibility, board.coverStyle);
    setBoards((prev) => [created, ...prev]);
    return created;
  }

  async function updateBoard(updated: Board) {
    await updateBoardRemote(updated.id, updated);
    setBoards((prev) => prev.map((b) => b.id === updated.id ? updated : b));
  }

  async function deleteBoard(boardId: string) {
    await deleteBoardRemote(boardId);
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  async function addItemsToBoard(boardId: string, itemIds: string[]) {
    await addItemsRemote(boardId, itemIds);
    setBoards((prev) => prev.map((b) =>
      b.id === boardId
        ? { ...b, itemIds: [...b.itemIds, ...itemIds.filter((id) => !b.itemIds.includes(id))] }
        : b,
    ));
  }

  async function removeItemFromBoard(boardId: string, itemId: string) {
    await removeItemRemote(boardId, itemId);
    setBoards((prev) => prev.map((b) =>
      b.id === boardId ? { ...b, itemIds: b.itemIds.filter((id) => id !== itemId) } : b,
    ));
  }

  async function moveItemToBoard(fromBoardId: string, toBoardId: string, itemId: string) {
    await moveItemRemote(fromBoardId, toBoardId, itemId);
    setBoards((prev) => prev.map((b) => {
      if (b.id === fromBoardId) return { ...b, itemIds: b.itemIds.filter((id) => id !== itemId) };
      if (b.id === toBoardId && !b.itemIds.includes(itemId)) return { ...b, itemIds: [...b.itemIds, itemId] };
      return b;
    }));
  }

  return (
    <BoardsContext.Provider value={{
      boards, isLoading, addBoard, updateBoard, deleteBoard,
      addItemsToBoard, removeItemFromBoard, moveItemToBoard,
    }}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards(): BoardsContextValue {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error('useBoards must be used within BoardsProvider');
  return ctx;
}
