import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { loadModel } from "@/utils/ModelLoader.ts";
import { useModel } from "@/contexts/ModelContext.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import Cursors from "@/components/ModelViewer/Cursors.tsx";
import type { Cursor } from "@/types/Cursor.ts";
import * as THREE from "three";
import { Redo2, Undo2, X, Keyboard, Save, SaveAll, Layers } from "lucide-react";
import { useHistory } from "@/contexts/HistoryContext.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Cursor as CursorEnum } from "@/types/Cursor.ts";
import { handleSaveScene } from "@/utils/StateSaver.ts";
import { ButtonGroup } from "@/components/ui/button-group.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import { useNotification } from "@/contexts/NotificationContext.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "@/components/ui/input.tsx";
import type { StateFile } from "@/types/StateFile.ts";

type ThreeAppProps = {
  setShowViewer: (show: boolean) => void;
};

function Loading({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <Spinner className="text-primary w-20 h-20" />
      <p className="mt-4 font-medium">Loading Model ({progress}%)</p>
    </div>
  );
}

export default function ThreeApp({ setShowViewer }: ThreeAppProps) {
  const { url, model } = useModel();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedTool, setSelectedTool] = useState<Cursor>("Select");
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const apiClient = useAxiosConfig();
  const { showNotification } = useNotification();
  const [versionName, setVersionName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<StateFile>();
  const [groupRef, setGroupRef] =
    useState<React.RefObject<THREE.Group | null>>();
  const [processedModelURL, setProcessedModelURL] = useState<string | null>(
    null,
  );
  const closeModel = () => {
    setShowViewer(false);
  };
  const { undo, redo, undoStack, redoStack } = useHistory();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const [undoShortcut, setUndoShortcut] = useState("Ctrl+Z");
  const [redoShortcut, setRedoShortcut] = useState("Ctrl+Y");

  const files = model?.stateFiles || [];
  const sortedFiles = [...files].sort((a, b) =>
    a.createdOn > b.createdOn ? -1 : 1,
  );

  useEffect(() => {
    setSelectedVersion(sortedFiles[0]);
  }, [sortedFiles]);

  const cursorTools = [
    { name: CursorEnum.Select, shortcut: "S" },
    { name: CursorEnum.MultiSelect, shortcut: "X" },
    { name: CursorEnum.Move, shortcut: "M" },
    { name: CursorEnum.Translate, shortcut: "T" },
    { name: CursorEnum.Scale, shortcut: "C" },
    { name: CursorEnum.Rotate, shortcut: "R" },
  ];

  useEffect(() => {
    const isMac = /Mac/i.test(navigator.userAgent);
    setUndoShortcut(isMac ? "⌘+Z" : "Ctrl+Z");
    setRedoShortcut(isMac ? "⌘+Y" : "Ctrl+Y");
  }, []);

  useEffect(() => {
    let isMounted = true;
    const objectUrlsToRevoke: string[] = [];

    const processAndLoad = async () => {
      if (!url || !model) {
        if (isMounted) setProcessedModelURL(null);
        return;
      }

      try {
        const mainFileName = url
          .substring(url.lastIndexOf("%2F") + 1)
          .split("?")[0];
        const mainFileResponse = await fetch(url);
        const mainFileBlob = await mainFileResponse.blob();
        const mainFile = new File([mainFileBlob], mainFileName);

        const dependentFilesPromises = (model.additionalFiles || []).map(
          async (file) => {
            const response = await fetch(file.url);
            const blob = await response.blob();
            return new File([blob], file.name);
          },
        );

        const dependentFiles = await Promise.all(dependentFilesPromises);

        await loadModel({
          file: mainFile,
          dependentFiles,
          objectUrlsToRevoke,
          setProcessedModelUrl: (newUrl) => {
            if (isMounted) {
              setProcessedModelURL(newUrl);
            }
          },
          isMounted,
        });
      } catch (error) {
        console.error("Error processing model files:", error);
        if (isMounted) {
          setProcessedModelURL(null);
        }
      }
    };

    processAndLoad();

    return () => {
      isMounted = false;
      objectUrlsToRevoke.forEach(URL.revokeObjectURL);
    };
  }, [url, model]);

  const saveModel = useCallback(
    async (targetVersion?: string) => {
      if (!groupRef || !model?.assetId) return;
      try {
        const state = handleSaveScene(groupRef);
        const formData = new FormData();
        formData.append("StateJson", state);
        if (targetVersion) {
          formData.append("TargetVersion", targetVersion);
        }
        const res = await apiClient.post(
          `/api/model/${model?.assetId}/state`,
          formData,
        );
        showNotification(res.data.message, "success");
        setVersionModalOpen(false);
        setVersionName("");
      } catch (error) {
        console.error("Error saving model:", error);
      }
    },
    [apiClient, groupRef, model?.assetId, showNotification],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (versionModalOpen) return;

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setVersionModalOpen(true);
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (selectedVersion?.version !== "Default") {
          saveModel(selectedVersion?.version);
        } else {
          saveModel();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      const tool = cursorTools.find(
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
    cursorTools,
    saveModel,
    selectedVersion?.version,
    setSelectedTool,
    versionModalOpen,
  ]);

  return (
    <div className={`w-full h-full relative`}>
      {loadingProgress > 0 && (
        <div className="absolute inset-0 z-10 bg-background/80 flex justify-center items-center">
          <Loading progress={loadingProgress} />
        </div>
      )}
      <div className={`justify-between`}>
        <div className="absolute top-3 left-5 z-20 flex items-center gap-2">
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
                      Ctrl+S
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Save as Version</p>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
                      Ctrl+Shift+S
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
                  disabled={!groupRef}
                  onClick={() => {
                    if (selectedVersion?.version !== "Default") {
                      saveModel(selectedVersion?.version);
                    } else {
                      saveModel();
                    }
                  }}
                  className="flex items-center px-2 py-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="size-4 lg:size-5 text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Save (Ctrl+S)</p>
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
                <p>Save as Version (Ctrl+Shift+S)</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>

          {model?.stateFiles && model?.stateFiles?.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  className="flex items-center p-2 rounded-md bg-muted transition hover:bg-background/60 text-sidebar-foreground/70"
                >
                  <Layers />
                  {sortedFiles[0].version}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="grid gap-4">
                  <h4 className="font-medium leading-none">Versions</h4>
                  <div className="grid gap-2">
                    {sortedFiles.map((file) => (
                      <div
                        onClick={() => setSelectedVersion(file)}
                        className={`py-2 px-4 rounded-md cursor-pointer ${file === selectedVersion ? "bg-primary/90 text-primary-foreground" : "bg-muted"}`}
                        key={file.createdOn}
                      >
                        <p className="text-sm">{file.version}</p>
                        <p
                          className={`text-sm ${file === selectedVersion ? "text-muted" : "text-muted-foreground"}`}
                        >
                          {formatDateTime(file.createdOn).fullStr}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Dialog open={versionModalOpen} onOpenChange={setVersionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Version</DialogTitle>
              <DialogDescription>
                Enter a name for this version to save your changes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="e.g., 'My First Design'"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                className={`cursor-pointer`}
                variant="outline"
                onClick={() => {
                  setVersionModalOpen(false);
                  setVersionName("");
                }}
              >
                Cancel
              </Button>
              <Button
                className={`cursor-pointer`}
                onClick={() => saveModel(versionName)}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Cursors
          setSelectedTool={setSelectedTool}
          selectedTool={selectedTool}
        />
      </div>
      <Canvas>
        <color attach="background" args={["#888888"]} />
        <Suspense fallback={null}>
          <Environment preset="city" background={false} />
          <Center>
            <Resize scale={3}>
              {processedModelURL && (
                <Model
                  setGroupRef={setGroupRef}
                  selectedTool={selectedTool}
                  processedUrl={processedModelURL}
                  setLoadingProgress={setLoadingProgress}
                />
              )}
            </Resize>
          </Center>
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping={false}
          mouseButtons={{
            LEFT:
              selectedTool === "Move" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
          }}
          touches={{
            ONE: selectedTool === "Move" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      </Canvas>
    </div>
  );
}
