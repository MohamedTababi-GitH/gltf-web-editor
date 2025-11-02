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
import { Redo2, Undo2, X, Keyboard, Save, SaveAll } from "lucide-react";
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const saveModel = useCallback(async () => {
    if (!groupRef || !model?.assetId) return;
    try {
      const state = handleSaveScene(groupRef);
      const formData = new FormData();
      formData.append("StateJson", state);
      const res = await apiClient.post(
        `/api/model/${model?.assetId}/state`,
        formData,
      );
      showNotification(res.data.message, "success");
    } catch (error) {
      console.error("Error saving model:", error);
    }
  }, [apiClient, groupRef, model?.assetId, showNotification]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        saveModel();
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
  }, [cursorTools, saveModel, setSelectedTool]);

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
                  onClick={saveModel}
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
        </div>

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
