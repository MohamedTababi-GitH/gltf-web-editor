import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model.tsx";
import React, { Suspense, useState } from "react";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import Cursors, { tools } from "@/features/ModelViewer/components/Cursors.tsx";
import type { Cursor } from "@/features/ModelViewer/types/Cursor.ts";
import * as THREE from "three";
import { useHistory } from "@/features/ModelViewer/contexts/HistoryContext.tsx";
import { useModelVersioning } from "@/features/ModelViewer/hooks/useModelVersioning.ts";
import { useModelLock } from "@/features/ModelViewer/hooks/useModelLock.ts";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.ts";
import { useProcessedModel } from "@/features/ModelViewer/hooks/useProcessedModel.ts";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning.ts";
import { ModelViewerToolbar } from "./ModelViewerToolbar.tsx";
import { SwitchWarningDialog } from "@/features/ModelViewer/components/SwitchWarningDialog.tsx";
import { CloseWarningDialog } from "./CloseWarningDialog.tsx";
import { SaveVersionDialog } from "@/features/ModelViewer/components/SaveVersionDialog.tsx";
import { Loading } from "@/features/ModelViewer/components/Loading.tsx";
import { DeleteVersionDialog } from "@/features/ModelViewer/components/DeleteVersionDialog.tsx";

export default function ThreeApp() {
  const { model } = useModel();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedTool, setSelectedTool] = useState<Cursor>("Select");
  const [groupRef, setGroupRef] =
    useState<React.RefObject<THREE.Group | null> | null>(null);

  const { undo, redo, undoStack, redoStack } = useHistory();

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  useUnsavedChangesWarning(canUndo);
  const processedModelURL = useProcessedModel();
  const versioning = useModelVersioning(
    groupRef as React.RefObject<THREE.Group | null>,
  );
  const { sortedFiles, baseline } = versioning;

  const shortcuts = useKeyboardShortcuts({
    saveModel: versioning.saveModel,
    setVersionModalOpen: versioning.setVersionModalOpen,
    setSelectedTool,
    canUndo,
    groupRef: groupRef as React.RefObject<THREE.Group | null>,
    selectedVersion: versioning.selectedVersion,
    versionModalOpen: versioning.versionModalOpen,
  });
  useModelLock({ id: model?.id, saveModel: versioning.saveModel, canUndo });

  return (
    <div className={`w-full h-full relative`}>
      {loadingProgress > 0 && (
        <div className="absolute inset-0 z-10 bg-background/80 flex justify-center items-center">
          <Loading progress={loadingProgress} />
        </div>
      )}

      {groupRef !== null && (
        <ModelViewerToolbar
          {...versioning}
          {...shortcuts}
          canUndo={canUndo}
          canRedo={canRedo}
          undo={undo}
          redo={redo}
          groupRef={groupRef}
          cursorTools={tools}
        />
      )}

      <SwitchWarningDialog {...versioning.switchWarningDialogProps} />
      <CloseWarningDialog
        {...versioning.closeWarningDialogProps}
        id={model?.id}
      />
      <SaveVersionDialog {...versioning.saveVersionDialogProps} />
      <DeleteVersionDialog {...versioning.deleteVersionDialogProps} />

      <Cursors
        setSelectedTool={setSelectedTool}
        selectedTool={selectedTool}
        versions={baseline ? [baseline, ...sortedFiles] : sortedFiles}
      />
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
                  selectedVersion={versioning.selectedVersion}
                  setSelectedVersion={versioning.setSelectedVersion}
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
