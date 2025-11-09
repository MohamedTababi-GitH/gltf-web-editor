import React, {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import * as THREE from "three";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import { tools } from "@/features/ModelViewer/components/Cursors.tsx";

interface KeyboardShortcutsProps {
  saveModel: (version?: string) => void;
  versionModalOpen: boolean;
  groupRef: React.RefObject<THREE.Group | null>;
  setVersionModalOpen: (open: boolean) => void;
  selectedVersion?: { version: string };
  canUndo: boolean;
  setSelectedTool: Dispatch<SetStateAction<Cursor>>;
}

export const useKeyboardShortcuts = ({
  saveModel,
  versionModalOpen,
  groupRef,
  setVersionModalOpen,
  selectedVersion,
  canUndo,
  setSelectedTool,
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (versionModalOpen) return;

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        if (groupRef) {
          setVersionModalOpen(true);
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canUndo && groupRef) {
          if (selectedVersion?.version === "Default") {
            saveModel();
          } else {
            saveModel(selectedVersion?.version);
          }
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      const tool = tools?.find(
        (t) => t.shortcut.toLowerCase() === event.key.toLowerCase(),
      );

      if (tool) {
        event.preventDefault();
        setSelectedTool(tool.name);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canUndo,
    groupRef,
    saveModel,
    selectedVersion?.version,
    setSelectedTool,
    setVersionModalOpen,
    versionModalOpen,
  ]);

  return {
    undoShortcut,
    redoShortcut,
    saveShortcut,
    saveAsShortcut,
  };
};
