import { useModel } from "@/shared/contexts/ModelContext";
import React, { useCallback, useEffect } from "react";
import * as THREE from "three";
import { isMesh } from "@/features/ModelViewer/utils/ModelUtils.ts";

type DiffSystemProps = {
  scene: THREE.Group;
  diffNodeIds: string[] | undefined;
  isComparing: boolean;
  setIsComparing: (isComparing: boolean) => void;
  originalMaterials: React.RefObject<
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  >;
  originalDiffMaterials: React.RefObject<
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  >;
};

export const useDiffSystem = ({
  scene,
  diffNodeIds,
  isComparing,
  setIsComparing,
  originalMaterials,
  originalDiffMaterials,
}: Readonly<DiffSystemProps>) => {
  const { setIsDiffMode } = useModel();

  const restoreOriginalDiffMaterials = useCallback(() => {
    for (const [mesh, originalMaterial] of originalDiffMaterials.current) {
      const currentMaterial = mesh.material;
      if (!originalMaterials.current.has(mesh)) {
        mesh.material = originalMaterial;
      }
      if (currentMaterial && currentMaterial !== originalMaterial) {
        if (Array.isArray(currentMaterial)) {
          currentMaterial.forEach((m) => m.dispose());
        } else {
          (currentMaterial as THREE.Material).dispose();
        }
      }
    }
    originalDiffMaterials.current.clear();
  }, [originalDiffMaterials, originalMaterials]);

  useEffect(() => {
    if (!diffNodeIds || diffNodeIds.length === 0) {
      if (isComparing) {
        restoreOriginalDiffMaterials();
        setIsComparing(false);
        setIsDiffMode(false);
      }
      return;
    }

    for (const obj of scene.children) {
      const id = obj.name;

      if (id && diffNodeIds.includes(id)) {
        obj.traverse((child) => {
          if (!isMesh(child)) return;
          const mesh = child;
          if (originalMaterials.current.has(mesh)) {
            return;
          }
          if (!originalDiffMaterials.current.has(mesh)) {
            const originalMaterial = mesh.material;
            originalDiffMaterials.current.set(mesh, originalMaterial);

            if (Array.isArray(originalMaterial)) {
              mesh.material = originalMaterial.map((m) => m.clone());
            } else {
              mesh.material = originalMaterial.clone();
            }
          }

          const mat = mesh.material;
          const color = "#ff3333";

          if (Array.isArray(mat)) {
            mat.forEach((m) => {
              (m as THREE.MeshStandardMaterial).color.set(color);
            });
          } else if (mat) {
            (mat as THREE.MeshStandardMaterial).color.set(color);
          }
        });
      }
    }
  }, [
    scene.children,
    diffNodeIds,
    restoreOriginalDiffMaterials,
    isComparing,
    setIsComparing,
    setIsDiffMode,
    originalMaterials,
    originalDiffMaterials,
  ]);

  return { originalDiffMaterials };
};
