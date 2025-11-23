import React, { useRef } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import type { StateFile } from "@/shared/types/StateFile.ts";
import { useSceneLoader } from "@/features/ModelViewer/hooks/useSceneLoader.ts";
import { useSceneRestoration } from "@/features/ModelViewer/hooks/useSceneRestoration.ts";
import { useSelectionManager } from "../hooks/useSelectionManager";
import { useDiffSystem } from "../hooks/useDiffSystem";
import { useSlotTargeting } from "@/features/ModelViewer/hooks/useSlotTargetting.ts";
import { useTransformLogic } from "@/features/ModelViewer/hooks/useTransformLogic.ts";

type ModelProps = {
  processedUrl: string;
  setLoadingProgress: (progress: number) => void;
  selectedTool: string;
  setGroupRef: (ref: React.RefObject<THREE.Group | null>) => void;
  selectedVersion: StateFile | undefined;
  collisionPrevention: boolean;
  setSelectedVersion: (version: StateFile | undefined) => void;
  diffNodeIds?: string[];
  isComparing: boolean;
  setIsComparing: (isComparing: boolean) => void;
};

export function Model({
  processedUrl,
  setLoadingProgress,
  selectedTool,
  selectedVersion,
  setSelectedVersion,
  setGroupRef,
  collisionPrevention,
  diffNodeIds,
  isComparing,
  setIsComparing,
}: Readonly<ModelProps>) {
  const isDraggingRef = useRef(false);
  const originalDiffMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
  );
  const { scene, groupRef } = useSceneLoader({
    processedUrl,
    setLoadingProgress,
    setGroupRef,
  });

  useSceneRestoration({
    scene,
    selectedVersion,
    setSelectedVersion,
  });

  const {
    selectedComponents,
    selectedComponentsRef,
    handleMeshClick,
    handleMiss,
    updateSidebarMeshes,
    highlightMaterial,
    originalMaterials,
    saveMaterial,
    restoreMaterial,
    setOriginalMaterialOpacity,
  } = useSelectionManager({
    originalDiffMaterials,
    selectedTool,
    diffNodeIds,
    isDraggingRef,
  });

  useDiffSystem({
    scene,
    diffNodeIds,
    isComparing,
    setIsComparing,
    originalMaterials,
    originalDiffMaterials,
  });

  useSlotTargeting({ scene, selectedComponents });

  const { handleGizmoChange, handleDragEnd, handleDragStart } =
    useTransformLogic({
      scene,
      selectedComponents,
      selectedComponentsRef,
      selectedTool,
      updateSidebarMeshes,
      saveMaterial,
      restoreMaterial,
      collisionPrevention,
      highlightMaterial,
      setOriginalMaterialOpacity,
      isDraggingRef,
    });

  const componentToControl = selectedComponents[0];

  return (
    <>
      {componentToControl &&
        (selectedTool === "Translate" ||
          selectedTool === "Rotate" ||
          selectedTool === "Scale") && (
          <TransformControls
            object={componentToControl}
            mode={
              selectedTool.toLowerCase() as "translate" | "rotate" | "scale"
            }
            size={1}
            onObjectChange={handleGizmoChange}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          />
        )}
      <group ref={groupRef}>
        {scene && (
          <primitive
            object={scene}
            onClick={handleMeshClick}
            onPointerMissed={handleMiss}
          />
        )}
      </group>
    </>
  );
}
