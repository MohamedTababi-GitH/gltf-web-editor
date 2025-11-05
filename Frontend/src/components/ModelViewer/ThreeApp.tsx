import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { useNavigation } from "@/contexts/NavigationContext.tsx";
import { useMutexApi } from "@/api/mutex";

function Loading({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <Spinner className="text-primary w-20 h-20" />
      <p className="mt-4 font-medium">Loading Model ({progress}%)</p>
    </div>
  );
}

export default function ThreeApp() {
  const { url, model, setModel } = useModel();
  const { setIsModelViewer } = useNavigation();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedTool, setSelectedTool] = useState<Cursor>("Select");
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const apiClient = useAxiosConfig();
  const [versionName, setVersionName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<StateFile>();
  const [versionToSwitch, setVersionToSwitch] = useState<StateFile>();
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [groupRef, setGroupRef] =
    useState<React.RefObject<THREE.Group | null>>();
  const [processedModelURL, setProcessedModelURL] = useState<string | null>(
    null,
  );
  // ** New (05-11) **
  const { unlockModel } = useMutexApi();

  const closeModel = async () => {
    if (canUndo) {
      setShowCloseWarning(true);
      return;
    }
    // ** NEW (05-11) **
    // release lock when closing!
    if (model?.id) {
      await unlockModel(model.id);
    }
    setIsModelViewer(false);
  };
  const { undo, redo, undoStack, redoStack, resetStacks } = useHistory();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const [undoShortcut, setUndoShortcut] = useState("Ctrl+Z");
  const [redoShortcut, setRedoShortcut] = useState("Ctrl+Y");
  const [saveShortcut, setSaveShortcut] = useState("Ctrl+S");
  const [saveAsShortcut, setSaveAsShortcut] = useState("Ctrl+Shift+S");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const files = model?.stateFiles || [];
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => (a.createdOn > b.createdOn ? -1 : 1)),
    [files],
  );

  const refetchModel = useCallback(async () => {
    try {
      const res = await apiClient.get(`api/model/${model?.id}`);
      setModel(res.data);
    } catch (e) {
      console.error("Error fetching model:", e);
    }
  }, [apiClient, model?.id, setModel]);

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
    setSaveShortcut(isMac ? "⌘+S" : "Ctrl+S");
    setSaveAsShortcut(isMac ? "⌘+Shift+S" : "Ctrl+Shift+S");
  }, []);

  const handleSwitch = async () => {
    if (!versionToSwitch) return;
    setSelectedVersion(versionToSwitch);
    resetStacks();
    setVersionModalOpen(false);
    setVersionToSwitch(undefined);
  };

  const additionalFilesJson = JSON.stringify(model?.additionalFiles);

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
          .substring(url.lastIndexOf("/") + 1)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, additionalFilesJson]);

  useEffect(() => {
    setSelectedVersion(sortedFiles[0]);
  }, [sortedFiles]);

  const handleVersionClick = (
    file: React.SetStateAction<StateFile | undefined>,
  ) => {
    if (canUndo) {
      setShowSwitchWarning(true);
      setVersionToSwitch(file);
      return;
    }
    setSelectedVersion(file);
    resetStacks();
  };

  const saveModel = useCallback(
    async (targetVersion?: string) => {
      if (!groupRef || !model?.assetId || !refetchModel) return;
      try {
        const state = handleSaveScene(groupRef);
        const formData = new FormData();
        formData.append("StateJson", state);
        if (targetVersion) {
          formData.append("TargetVersion", targetVersion);
        }
        await apiClient.post(`/api/model/${model?.assetId}/state`, formData);
        setVersionModalOpen(false);
        setVersionName("");
        resetStacks();

        await refetchModel();
      } catch (error) {
        console.error("Error saving model:", error);
      }
    },
    [apiClient, groupRef, model?.assetId, refetchModel, resetStacks],
  );

  const handleDeleteVersion = async (file: StateFile) => {
    if (!model?.assetId || !file?.version) return;
    try {
      await apiClient.delete(
        `/api/model/${model?.assetId}/state/${file?.version}`,
      );
      await refetchModel();
    } catch (error) {
      console.error("Error deleting model version:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (versionModalOpen) return;

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        setVersionModalOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (selectedVersion?.version === "Default") {
          saveModel();
        } else {
          saveModel(selectedVersion?.version);
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
                  if (selectedVersion?.version === "Default") {
                    saveModel();
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
        {model?.stateFiles && model?.stateFiles?.length > 0 && (
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
                          handleVersionClick(file);
                        }}
                        className={`w-full text-left py-2 px-4 rounded-md cursor-pointer ${
                          file === selectedVersion
                            ? "bg-primary/90 text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{file.version}</p>
                        <p
                          className={`text-sm ${
                            file === selectedVersion
                              ? "text-muted"
                              : "text-muted-foreground"
                          }`}
                        >
                          Last Saved: {formatDateTime(file.createdOn).fullStr}
                        </p>
                      </button>
                      {sortedFiles.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild={true}>
                            <Button
                              onClick={() => {
                                handleDeleteVersion(file);
                              }}
                              className="flex items-center px-2 py-2 rounded-md bg-muted transition h-full border hover:bg-destructive/60 text-sidebar-foreground/70"
                            >
                              <X className="size-4 lg:size-5 text-foreground" />
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

      <AlertDialog open={showSwitchWarning} onOpenChange={setShowSwitchWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes!</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to a different version will discard your unsaved
              changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSwitch}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard and Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes!</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this view will discard your unsaved changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsModelViewer(false);
              }}
            >
              Discard and Close
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedVersion?.version === "Default") {
                  saveModel();
                } else {
                  saveModel(selectedVersion?.version);
                }
                setIsModelViewer(false);
              }}
              className="bg-chart-2 hover:bg-chart-2/90"
            >
              Save and Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              maxLength={25}
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

      <Cursors setSelectedTool={setSelectedTool} selectedTool={selectedTool} />
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
                  selectedVersion={selectedVersion}
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
