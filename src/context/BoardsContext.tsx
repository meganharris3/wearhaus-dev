import React, { createContext, useContext, useState } from 'react';
import type { Board } from '../types';

const MOCK_BOARDS: Board[] = [
  { id: 'b1', name: 'Going Out', visibility: 'public',  coverStyle: 'mosaic', itemIds: ['1','2','3','4'], createdAt: '2026-06-01T00:00:00Z', ownerId: 'me' },
  { id: 'b2', name: 'Formal',    visibility: 'public',  coverStyle: 'mosaic', itemIds: ['4','6','8'],     createdAt: '2026-06-02T00:00:00Z', ownerId: 'me' },
  { id: 'b3', name: 'Cozy',      visibility: 'friends', coverStyle: 'stack',  itemIds: ['7','3'],         createdAt: '2026-06-03T00:00:00Z', ownerId: 'me' },
];

interface BoardsContextValue {
  boards: Board[];
  addBoard: (board: Board) => void;
  updateBoard: (board: Board) => void;
  deleteBoard: (boardId: string) => void;
  addItemsToBoard: (boardId: string, itemIds: string[]) => void;
  removeItemFromBoard: (boardId: string, itemId: string) => void;
  moveItemToBoard: (fromBoardId: string, toBoardId: string, itemId: string) => void;
}

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<Board[]>(MOCK_BOARDS);

  function addBoard(board: Board) {
    setBoards((prev) => [board, ...prev]);
  }

  function updateBoard(updated: Board) {
    setBoards((prev) => prev.map((b) => b.id === updated.id ? updated : b));
  }

  function deleteBoard(boardId: string) {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  function addItemsToBoard(boardId: string, itemIds: string[]) {
    setBoards((prev) => prev.map((b) =>
      b.id === boardId
        ? { ...b, itemIds: [...b.itemIds, ...itemIds.filter((id) => !b.itemIds.includes(id))] }
        : b,
    ));
  }

  function removeItemFromBoard(boardId: string, itemId: string) {
    setBoards((prev) => prev.map((b) =>
      b.id === boardId ? { ...b, itemIds: b.itemIds.filter((id) => id !== itemId) } : b,
    ));
  }

  function moveItemToBoard(fromBoardId: string, toBoardId: string, itemId: string) {
    setBoards((prev) => prev.map((b) => {
      if (b.id === fromBoardId) return { ...b, itemIds: b.itemIds.filter((id) => id !== itemId) };
      if (b.id === toBoardId && !b.itemIds.includes(itemId)) return { ...b, itemIds: [...b.itemIds, itemId] };
      return b;
    }));
  }

  return (
    <BoardsContext.Provider value={{ boards, addBoard, updateBoard, deleteBoard, addItemsToBoard, removeItemFromBoard, moveItemToBoard }}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards(): BoardsContextValue {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error('useBoards must be used within BoardsProvider');
  return ctx;
}
