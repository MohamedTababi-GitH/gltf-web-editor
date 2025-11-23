import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { isMesh } from "@/features/ModelViewer/utils/ModelUtils.ts";

type SlotTargettingProps = {
  selectedComponents: THREE.Object3D[];
  scene: THREE.Group | null;
};

export const useSlotTargeting = ({
  selectedComponents,
  scene,
}: Readonly<SlotTargettingProps>) => {
  const originalTargetMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
  );
  const targetHighlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ad42f5",
        emissive: "#ad42f5",
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 1,
        roughness: 0.5,
        metalness: 0.5,
      }),
    [],
  );
  const restoreTargetMaterials = useCallback(() => {
    for (const [mesh, material] of originalTargetMaterials.current) {
      mesh.material = material;
    }
    originalTargetMaterials.current.clear();
  }, []);

  useEffect(() => {
    restoreTargetMaterials();

    if (selectedComponents.length !== 1 || !scene) return;

    const leader = selectedComponents[0];
    const mountingDesc = leader.userData.MountingDescription;
    const allowedSlotNames: string[] = mountingDesc?.entries;

    if (!allowedSlotNames || allowedSlotNames.length === 0) return;

    scene.traverse((candidate) => {
      if (candidate === leader) return;
      if (candidate.userData.isSlot) return;
      if (!candidate.visible) return;
      if (leader.getObjectById(candidate.id)) return;

      let isEligible = false;

      candidate.children.forEach((child) => {
        if (child.userData.isSlot) {
          if (allowedSlotNames.includes(child.userData.slotDescription)) {
            isEligible = true;
          }
        }
      });

      if (isEligible) {
        candidate.traverse((child) => {
          if (isMesh(child) && !child.userData.isSlot) {
            if (!originalTargetMaterials.current.has(child)) {
              originalTargetMaterials.current.set(child, child.material);
              child.material = targetHighlightMaterial;
            }
          }
        });
      }
    });
  }, [
    selectedComponents,
    scene,
    restoreTargetMaterials,
    targetHighlightMaterial,
  ]);
};
