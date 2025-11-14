import React, {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import * as THREE from "three";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { cursors } from "@/features/ModelViewer/components/Cursors.tsx";
import type { ToolConfig } from "@/features/ModelViewer/components/ThreeApp.tsx";

type KeyboardShortcutsProps = {
  saveModel: (version?: string) => void;
  versionModalOpen: boolean;
  groupRef: React.RefObject<THREE.Group | null>;
  setVersionModalOpen: (open: boolean) => void;
  selectedVersion?: { version: string };
  canUndo: boolean;
  setSelectedTool: Dispatch<SetStateAction<Cursor>>;
  tools: ToolConfig[];
};

export const useKeyboardShortcuts = ({
  saveModel,
  versionModalOpen,
  groupRef,
  setVersionModalOpen,
  selectedVersion,
  canUndo,
  setSelectedTool,
  tools,
}: KeyboardShortcutsProps) => {
  const [undoShortcut, setUndoShortcut] = useState("Ctrl+Z");
  const [redoShortcut, setRedoShortcut] = useState("Ctrl+Y");
  const [saveShortcut, setSaveShortcut] = useState("Ctrl+S");
  const [saveAsShortcut, setSaveAsShortcut] = useState("Ctrl+Shift+S");

  useEffect(() => {
    const isMac = /Mac/i.test(navigator.userAgent);
    setUndoShortcut(isMac ? "⌘+Z" : "Ctrl+Z");
    setRedoShortcut(isMac ? "⌘+Y" : "Ctrl+Y");
    setSaveShortcut(isMac ? "⌘+S" : "Ctrl+S");
    setSaveAsShortcut(isMac ? "⌘+Shift+S" : "Ctrl+Shift+S");
  }, []);

  const handleSave = useCallback((): void => {
    if (canUndo && groupRef && selectedVersion?.version !== "Original") {
      saveModel(selectedVersion?.version);
    }
  }, [canUndo, groupRef, saveModel, selectedVersion?.version]);

  const handleCursorSelect = useCallback(
    (key: string): boolean => {
      const cursor = cursors?.find(
        (c) => c.shortcut.toLowerCase() === key.toLowerCase(),
      );

      if (cursor) {
        setSelectedTool(cursor.name);
        return true;
      }
      return false;
    },
    [setSelectedTool],
  );

  const handleToolSelect = useCallback(
    (key: string): boolean => {
      const tool = tools?.find(
        (t) => t.shortcut.toLowerCase() === key.toLowerCase(),
      );

      if (tool) {
        tool.onClick?.();
        return true;
      }
      return false;
    },
    [tools],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (versionModalOpen) return;

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const lowerKey = key.toLowerCase();
      const isCtrl = ctrlKey || metaKey;

      if (isCtrl && shiftKey && lowerKey === "s") {
        event.preventDefault();
        if (groupRef) {
          setVersionModalOpen(true);
        }
        return;
      }
      if (isCtrl && lowerKey === "s") {
        event.preventDefault();
        handleSave();
        return;
      }

      if (isCtrl || shiftKey || altKey) {
        return;
      }

      if (handleCursorSelect(lowerKey)) {
        event.preventDefault();
      }

      if (handleToolSelect(lowerKey)) {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canUndo,
    groupRef,
    handleSave,
    handleCursorSelect,
    saveModel,
    selectedVersion?.version,
    setSelectedTool,
    setVersionModalOpen,
    versionModalOpen,
    handleToolSelect,
  ]);

  return {
    undoShortcut,
    redoShortcut,
    saveShortcut,
    saveAsShortcut,
  };
};
