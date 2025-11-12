import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/tooltip.tsx";
import { Button } from "@/shared/components/button.tsx";
import {
  Keyboard,
  Layers,
  Redo2,
  Save,
  SaveAll,
  Trash,
  Undo2,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/popover.tsx";
import { ButtonGroup } from "@/shared/components/button-group.tsx";
import { Separator } from "@/shared/components/separator.tsx";
import { formatDateTime } from "@/shared/utils/DateTime.ts";
import { useModel } from "@/shared/contexts/ModelContext";
import type { StateFile } from "@/shared/types/StateFile.ts";
import React from "react";
import * as THREE from "three";
import { useMutex } from "@/shared/hooks/useMutex.ts";
import { useNavigation } from "@/shared/contexts/NavigationContext";

type ModelViewerToolbarProps = {
  setVersionModalOpen: (open: boolean) => void;
  selectedVersion: StateFile | undefined;
  setShowCloseWarning: (show: boolean) => void;
  handleDeleteVersionClick: (file: StateFile) => void;
  saveModel: (version?: string) => void;
  handleVersionClick: (version: StateFile, canUndo: boolean) => void;
  sortedFiles: StateFile[];
  undoShortcut: string;
  redoShortcut: string;
  saveShortcut: string;
  saveAsShortcut: string;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  groupRef: React.RefObject<THREE.Group | null>;
  cursorTools: { name: string; shortcut: string }[];
};

export function ModelViewerToolbar({
  setVersionModalOpen,
  selectedVersion,
  setShowCloseWarning,
  handleDeleteVersionClick,
  saveModel,
  handleVersionClick,
  sortedFiles,
  undoShortcut,
  redoShortcut,
  saveShortcut,
  saveAsShortcut,
  canUndo,
  canRedo,
  undo,
  redo,
  groupRef,
  cursorTools,
}: Readonly<ModelViewerToolbarProps>) {
  const { model } = useModel();
  const { unlockModel } = useMutex();
  const { setIsModelViewer } = useNavigation();
  const closeModel = async () => {
    if (canUndo) {
      setShowCloseWarning(true);
      return;
    }

    if (model?.id) {
      await unlockModel(model.id);
    }
    setIsModelViewer(false);
  };
  return (
    <div className="absolute top-3 left-5 right-5 z-20 flex items-center flex-wrap gap-2 select-none">
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            onClick={closeModel}
            className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70"
          >
            <X className="size-4 lg:size-5 text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Close</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo2 className="size-4 lg:size-5 text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Undo ({undoShortcut})</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button
            onClick={redo}
            disabled={!canRedo}
            className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Redo2 className="size-4 lg:size-5 text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Redo ({redoShortcut})</p>
        </TooltipContent>
      </Tooltip>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <PopoverTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="flex items-center p-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70"
              >
                <Keyboard className="size-4 lg:size-5 text-foreground" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Keyboard Shortcuts</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-64">
          <div className="grid gap-4">
            <h4 className="font-medium leading-none">Shortcuts</h4>
            <div className="grid gap-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Actions
              </h5>
              <div className="flex items-center justify-between">
                <p className="text-sm">Undo</p>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                  {undoShortcut}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Redo</p>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                  {redoShortcut}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Save</p>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                  {saveShortcut}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Save as Version</p>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                  {saveAsShortcut}
                </kbd>
              </div>
            </div>
            <div className="grid gap-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Tools
              </h5>
              {cursorTools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between"
                >
                  <p className="text-sm">{tool.name}</p>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                    {tool.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              disabled={!groupRef || !canUndo}
              onClick={() => {
                if (selectedVersion?.version === "Baseline") {
                  saveModel("Default");
                } else {
                  saveModel(selectedVersion?.version);
                }
              }}
              className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="size-4 lg:size-5 text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Save ({saveShortcut})</p>
          </TooltipContent>
        </Tooltip>
        <Separator orientation={"vertical"} />
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Button
              disabled={!groupRef}
              onClick={() => {
                setVersionModalOpen(true);
              }}
              className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SaveAll className="size-4 lg:size-5 text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Save as Version ({saveAsShortcut})</p>
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>
      {sortedFiles.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              className="flex items-center justify-start p-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70"
            >
              <Layers />
              {selectedVersion?.version}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 select-none">
            <div className="grid gap-4">
              <h4 className="font-medium leading-none">Versions</h4>
              <ul className="grid gap-2">
                {sortedFiles.map((file) => (
                  <li className="list-none flex gap-2" key={file.createdOn}>
                    <button
                      type="button"
                      onClick={() => {
                        handleVersionClick(file, canUndo);
                      }}
                      className={`w-full text-left py-2 px-4 rounded-md cursor-pointer ${
                        file.version === selectedVersion?.version
                          ? "bg-primary/90 text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{file.version}</p>
                      <p
                        className={`text-sm ${
                          file.version === selectedVersion?.version
                            ? "text-muted"
                            : "text-muted-foreground"
                        }`}
                      >
                        Last Saved: {formatDateTime(file.createdOn).fullStr}
                      </p>
                    </button>
                    {file.version !== "Baseline" && (
                      <Tooltip>
                        <TooltipTrigger asChild={true}>
                          <Button
                            onClick={() => {
                              handleDeleteVersionClick(file);
                            }}
                            className="flex items-center px-2 py-2 rounded-md bg-muted transition h-full border hover:bg-destructive/60 text-sidebar-foreground/70"
                          >
                            <Trash className="size-4 lg:size-5 text-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>
                            Delete{" "}
                            <b>
                              <i>{file.version}</i>
                            </b>{" "}
                            Version
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
