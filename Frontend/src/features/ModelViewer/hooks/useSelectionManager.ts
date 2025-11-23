import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { isMesh } from "@/features/ModelViewer/utils/ModelUtils.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { Cursor } from "../types/Cursor";

type SelectionManagerProps = {
  originalDiffMaterials: React.RefObject<
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  >;
  selectedTool: string;
  diffNodeIds?: string[];
  isDraggingRef: React.RefObject<boolean>;
};

export const useSelectionManager = ({
  originalDiffMaterials,
  selectedTool,
  diffNodeIds,
  isDraggingRef,
}: Readonly<SelectionManagerProps>) => {
  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
  const { setMeshes } = useModel();
  const selectedComponentsRef = useRef<THREE.Object3D[]>(selectedComponents);
  const originalMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
  );
  const highlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#333333"),
        emissive: new THREE.Color("#00d0ff"),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
        roughness: 0.5,
        metalness: 0.5,
      }),
    [],
  );
  useEffect(() => {
    selectedComponentsRef.current = selectedComponents;
  }, [selectedComponents]);
  const restoreOriginalMaterials = useCallback(() => {
    for (const [mesh, material] of originalMaterials.current) {
      mesh.material = material;
    }
    originalMaterials.current.clear();
  }, []);

  const applyHighlight = useCallback(
    (component: THREE.Object3D) => {
      component.traverse((child) => {
        if (isMesh(child)) {
          if (!originalMaterials.current.has(child)) {
            const materialToSave =
              originalDiffMaterials.current.get(child) ?? child.material;
            originalMaterials.current.set(child, materialToSave);

            if (originalDiffMaterials.current.has(child)) {
              originalDiffMaterials.current.delete(child);
            }

            const clonedHighlight = highlightMaterial.clone();
            if ("opacity" in child.material) {
              clonedHighlight.opacity = child.material.opacity ?? 1;
            } else {
              clonedHighlight.opacity = 1;
            }
            child.material = clonedHighlight;
          }
        }
      });
    },
    [highlightMaterial, originalDiffMaterials],
  );

  const removeHighlight = useCallback(
    (component: THREE.Object3D) => {
      const isDiffed = diffNodeIds && diffNodeIds.includes(component.name);
      component.traverse((child) => {
        if (isMesh(child)) {
          const originalMaterial = originalMaterials.current.get(child);
          if (originalMaterial) {
            const currentMat = child.material;
            if (isDiffed) {
              originalDiffMaterials.current.set(child, originalMaterial);
              if (Array.isArray(originalMaterial)) {
                child.material = originalMaterial.map((m) => m.clone());
              } else {
                child.material = originalMaterial.clone();
              }

              const mat = child.material;
              const color = "#ff3333";

              if (Array.isArray(mat)) {
                mat.forEach((m) =>
                  (m as THREE.MeshStandardMaterial).color.set(color),
                );
              } else if (mat) {
                (mat as THREE.MeshStandardMaterial).color.set(color);
              }
            } else {
              child.material = originalMaterial;
            }
            if (currentMat && currentMat !== originalMaterial) {
              if (Array.isArray(currentMat)) {
                currentMat.forEach((m) => m.dispose());
              } else {
                currentMat.dispose();
              }
            }
            originalMaterials.current.delete(child);
          }
        }
      });
    },
    [diffNodeIds, originalDiffMaterials],
  );

  useEffect(() => {
    return () => {
      restoreOriginalMaterials();
      setSelectedComponents([]);
      setMeshes([]);
    };
  }, [restoreOriginalMaterials, setMeshes]);

  const updateSidebarMeshes = useCallback(
    (components: THREE.Object3D[]) => {
      setMeshes(
        components.map((component) => {
          let opacity: number;

          let foundOpacity: number | undefined;
          component.traverse((child) => {
            if (foundOpacity !== undefined) return;
            if (!isMesh(child)) return;

            const material = child.material;

            const getOpacity = (mat: THREE.Material) => {
              if ("opacity" in mat) {
                foundOpacity = mat.opacity;
              }
            };

            if (Array.isArray(material)) {
              for (const m of material) {
                getOpacity(m);
              }
            } else {
              getOpacity(material);
            }
          });

          // eslint-disable-next-line prefer-const
          opacity = foundOpacity ?? 1;

          return {
            id: component.id,
            name: component.name || "Unnamed Component",
            X: component.position.x.toFixed(3),
            Y: component.position.y.toFixed(3),
            Z: component.position.z.toFixed(3),
            isVisible: component.visible,
            opacity: opacity,
          };
        }),
      );
    },
    [setMeshes],
  );

  const saveMaterial = useCallback((child: THREE.Mesh) => {
    if (!originalMaterials.current.has(child)) {
      originalMaterials.current.set(child, child.material);
    }
  }, []);

  const restoreMaterial = useCallback((child: THREE.Mesh) => {
    const original = originalMaterials.current.get(child);
    if (original) {
      const currentMat = child.material;

      child.material = original;

      if (currentMat && currentMat !== original) {
        if (Array.isArray(currentMat)) {
          currentMat.forEach((m) => m.dispose());
        } else {
          (currentMat as THREE.Material).dispose();
        }
      }

      originalMaterials.current.delete(child);
    }
  }, []);

  const setOriginalMaterialOpacity = useCallback(
    (child: THREE.Mesh, opacity: number) => {
      const original = originalMaterials.current.get(child);
      if (original) {
        const update = (m: THREE.Material) => {
          m.transparent = true;
          m.opacity = opacity;
          m.needsUpdate = true;
        };

        if (Array.isArray(original)) {
          original.forEach(update);
        } else {
          update(original);
        }
      }
    },
    [],
  );

  const handleMeshClick = useCallback(
    (event: { stopPropagation: () => void; object: THREE.Mesh }) => {
      if (isDraggingRef.current) return;
      event.stopPropagation();
      const clickedMesh = event.object;
      if (!isMesh(clickedMesh)) return;

      const componentParent = clickedMesh.parent;
      if (!componentParent) return;

      const isSelected = selectedComponents.some(
        (comp) => comp.id === componentParent.id,
      );
      const isTransformTool =
        selectedTool === Cursor.Translate ||
        selectedTool === Cursor.Rotate ||
        selectedTool === Cursor.Scale;

      if (selectedTool === Cursor.MultiSelect) {
        if (isSelected) {
          const newSelection = selectedComponents.filter(
            (comp) => comp.id !== componentParent.id,
          );
          setSelectedComponents(newSelection);
          removeHighlight(componentParent);
          updateSidebarMeshes(newSelection);
        } else {
          const newSelection = [...selectedComponents, componentParent];
          setSelectedComponents(newSelection);
          applyHighlight(componentParent);
          updateSidebarMeshes(newSelection);
        }
      } else if (isSelected) {
        if (isTransformTool) return;
        selectedComponents.forEach((comp) => removeHighlight(comp));
        setSelectedComponents([]);
        updateSidebarMeshes([]);
      } else {
        selectedComponents.forEach((comp) => removeHighlight(comp));
        setSelectedComponents([componentParent]);
        applyHighlight(componentParent);
        updateSidebarMeshes([componentParent]);
      }
    },
    [
      selectedComponents,
      selectedTool,
      updateSidebarMeshes,
      applyHighlight,
      removeHighlight,
    ],
  );

  const handleMiss = useCallback(() => {
    if (selectedComponents.length > 0) {
      selectedComponents.forEach((comp) => removeHighlight(comp));
      setSelectedComponents([]);
      updateSidebarMeshes([]);
    }
  }, [selectedComponents, removeHighlight, updateSidebarMeshes]);

  return {
    selectedComponents,
    selectedComponentsRef,
    setSelectedComponents,
    handleMeshClick,
    handleMiss,
    updateSidebarMeshes,
    restoreOriginalMaterials,
    highlightMaterial,
    originalMaterials,
    saveMaterial,
    restoreMaterial,
    setOriginalMaterialOpacity,
  };
};
