import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ICommand } from "../types/ICommand";

type HistoryContextState = {
  undoStack: ICommand[];
  redoStack: ICommand[];
  addCommand: (command: ICommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  resetStacks: () => void;
};

const HistoryContext = createContext<HistoryContextState | undefined>(
  undefined,
);

export const HistoryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [undoStack, setUndoStack] = useState<ICommand[]>([]);
  const [redoStack, setRedoStack] = useState<ICommand[]>([]);

  const addCommand = useCallback((command: ICommand) => {
    setUndoStack((prev) => [...prev, command]);
    setRedoStack([]);
  }, []);

  const resetStacks = () => {
    setUndoStack([]);
    setRedoStack([]);
  };

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const command = undoStack[undoStack.length - 1];
    command.undo();

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [command, ...prev]);
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const command = redoStack[0];
    command.execute();

    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, command]);
  }, [redoStack]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;

      if (isCtrlOrMeta && event.key === "z") {
        event.preventDefault();
        undo();
      }

      if (isCtrlOrMeta && event.key === "y") {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const value = useMemo(
    () => ({
      undoStack,
      redoStack,
      addCommand,
      undo,
      redo,
      clear,
      resetStacks,
    }),
    [undoStack, redoStack, addCommand, undo, redo, clear],
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return context;
};
