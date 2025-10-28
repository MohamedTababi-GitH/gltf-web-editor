import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import { useModel } from "@/contexts/ModelContext";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

export function Model({
  processedUrl,
  setLoadingProgress,
  selectedTool,
}: {
  processedUrl: string;
  setLoadingProgress: (progress: number) => void;
  selectedTool: string;
}) {
  const { setMeshes, setToggleComponentVisibility } = useModel();

  const groupRef = useRef<THREE.Group>(null);
  const initialOffsets = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  const initialRotations = useRef(new Map<THREE.Object3D, THREE.Quaternion>());
  const initialScales = useRef(new Map<THREE.Object3D, THREE.Vector3>());

  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
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

  const toggleComponentVisibility = useCallback(
    (componentId: number, newVisibility: boolean, newOpacity: number) => {
      const componentToToggle = selectedComponents.find(
        (comp) => comp.id === componentId,
      );

      if (componentToToggle) {
        componentToToggle.visible = newVisibility;

        componentToToggle.traverse((child) => {
          if (!isMesh(child)) return;

          const currentMaterial = child.material;
          const savedOriginal = originalMaterials.current.get(child);

          const updateOpacity = (mat: THREE.Material | THREE.Material[]) => {
            if (Array.isArray(mat)) {
              mat.forEach((m) => {
                m.transparent = true;
                (
                  m as THREE.Material & {
                    opacity: number;
                    transparent: boolean;
                  }
                ).opacity = newOpacity;
                m.needsUpdate = true;
              });
            } else {
              mat.transparent = true;
              (mat as THREE.MeshStandardMaterial).opacity = newOpacity;
              mat.needsUpdate = true;
            }
          };

          updateOpacity(currentMaterial);
          if (savedOriginal) updateOpacity(savedOriginal);
        });
      }

      // 2. Update the context state (meshes array)
      setMeshes((prevMeshes) =>
        prevMeshes.map((mesh) =>
          mesh.id === componentId
            ? { ...mesh, isVisible: newVisibility, opacity: newOpacity }
            : mesh,
        ),
      );
    },
    [selectedComponents, setMeshes],
  );

  useEffect(() => {
    setToggleComponentVisibility(() => toggleComponentVisibility);
  }, [setToggleComponentVisibility, toggleComponentVisibility]);

  const updateSidebarMeshes = useCallback(
    (components: THREE.Object3D[]) => {
      setMeshes(
        components.map((component) => {
          let opacity = 1;

          // read opacity from original material if highlighted
          let foundOpacity: number | undefined;
          component.traverse((child) => {
            if (foundOpacity !== undefined) return;
            if (isMesh(child)) {
              const saved = originalMaterials.current.get(child) as
                | THREE.Material
                | THREE.Material[]
                | undefined;
              if (saved) {
                if (Array.isArray(saved)) {
                  const first = saved[0];
                  foundOpacity =
                    "opacity" in first
                      ? ((first as THREE.Material & { opacity: number })
                          .opacity ?? 1)
                      : 1;
                } else {
                  foundOpacity =
                    "opacity" in saved
                      ? ((saved as THREE.Material & { opacity: number })
                          .opacity ?? 1)
                      : 1;
                }
              } else {
                const mat = child.material;
                if (Array.isArray(mat)) {
                  const first = mat[0];
                  foundOpacity =
                    "opacity" in first
                      ? ((first as THREE.Material & { opacity: number })
                          .opacity ?? 1)
                      : 1;
                } else {
                  foundOpacity =
                    "opacity" in mat
                      ? ((mat as THREE.Material & { opacity: number })
                          .opacity ?? 1)
                      : 1;
                }
              }
            }
          });
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

  const gltf = useLoader(GLTFLoader, processedUrl, (loader) => {
    loader.manager.onProgress = (_url, loaded, total) => {
      const progress = Math.round((loaded / total) * 100);
      setLoadingProgress(progress);
      if (progress === 100) {
        setLoadingProgress(0);
      }
    };
  });

  const scene = useMemo(() => {
    if (!gltf.scene) return new THREE.Group();
    const clonedScene = gltf.scene.clone(true);

    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 3;
    const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;
    clonedScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const center = scaledBox.getCenter(new THREE.Vector3());
    clonedScene.position.sub(center);

    // FIX: Give each mesh its own material clone - otherwise the similar meshes will change together..
    clonedScene.traverse((obj) => {
      if (isMesh(obj)) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else {
          obj.material = obj.material.clone();
        }
      }
    });

    return clonedScene;
  }, [gltf.scene]);

  useEffect(() => {
    initialOffsets.current.clear();
    initialRotations.current.clear();
    initialScales.current.clear();

    if (selectedComponents.length > 0) {
      const leader = selectedComponents[0];

      leader.updateWorldMatrix(true, false);
      const leaderWorldPos = leader.getWorldPosition(new THREE.Vector3());
      const leaderWorldRot = leader.getWorldQuaternion(new THREE.Quaternion());
      const leaderWorldScale = leader.getWorldScale(new THREE.Vector3());

      for (let i = 1; i < selectedComponents.length; i++) {
        const follower = selectedComponents[i];
        follower.updateWorldMatrix(true, false);

        const followerWorldPos = follower.getWorldPosition(new THREE.Vector3());
        const offset = followerWorldPos.clone().sub(leaderWorldPos);
        initialOffsets.current.set(follower, offset);

        const followerWorldRot = follower.getWorldQuaternion(
          new THREE.Quaternion(),
        );
        const rotationDelta = new THREE.Quaternion().copy(followerWorldRot);
        rotationDelta.premultiply(
          new THREE.Quaternion().copy(leaderWorldRot).invert(),
        );
        initialRotations.current.set(follower, rotationDelta);

        const followerWorldScale = follower.getWorldScale(new THREE.Vector3());
        const scaleRatio = followerWorldScale.clone().divide(leaderWorldScale);
        initialScales.current.set(follower, scaleRatio);
      }
    }
  }, [selectedComponents]);

  const handleGizmoChange = useCallback(() => {
    const leader = selectedComponents[0];
    if (!leader) return;

    leader.updateWorldMatrix(true, false);

    const leaderNewWorldPos = leader.getWorldPosition(new THREE.Vector3());
    const leaderNewWorldRot = leader.getWorldQuaternion(new THREE.Quaternion());
    const leaderNewWorldScale = leader.getWorldScale(new THREE.Vector3());

    for (let i = 1; i < selectedComponents.length; i++) {
      const follower = selectedComponents[i];

      const offset = initialOffsets.current.get(follower);
      if (offset) {
        const newWorldPos = leaderNewWorldPos.clone().add(offset);
        follower.parent?.updateWorldMatrix(true, false);
        follower.parent?.worldToLocal(newWorldPos);
        follower.position.copy(newWorldPos);
      }

      const rotationDelta = initialRotations.current.get(follower);
      if (rotationDelta) {
        const newWorldRot = new THREE.Quaternion().copy(leaderNewWorldRot);
        newWorldRot.multiply(rotationDelta);

        const localRot = new THREE.Quaternion();
        follower.parent?.updateWorldMatrix(true, true);
        const parentWorldRotInv = follower.parent
          ? follower.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
          : new THREE.Quaternion();
        localRot.copy(newWorldRot).premultiply(parentWorldRotInv);
        follower.quaternion.copy(localRot);
      }

      const scaleRatio = initialScales.current.get(follower);
      if (scaleRatio) {
        const newWorldScale = leaderNewWorldScale.clone().multiply(scaleRatio);
        const parentWorldScale = follower.parent
          ? follower.parent.getWorldScale(new THREE.Vector3())
          : new THREE.Vector3(1, 1, 1);
        const localScale = newWorldScale.divide(parentWorldScale);
        follower.scale.copy(localScale);
      }
    }

    updateSidebarMeshes(selectedComponents);
  }, [selectedComponents, updateSidebarMeshes]);

  const restoreOriginalMaterials = useCallback(() => {
    originalMaterials.current.forEach((material, mesh) => {
      mesh.material = material;
    });
    originalMaterials.current.clear();
  }, []);

  const applyHighlight = useCallback(
    (component: THREE.Object3D) => {
      component.traverse((child) => {
        if (isMesh(child)) {
          if (!originalMaterials.current.has(child)) {
            originalMaterials.current.set(child, child.material);

            // Clone a new highlight material so each mesh has its own highlight
            const clonedHighlight = highlightMaterial.clone();
            if ("opacity" in child.material) {
              clonedHighlight.opacity =
                (child.material as THREE.Material & { opacity: number })
                  .opacity ?? 1;
            } else {
              clonedHighlight.opacity = 1;
            }
            child.material = clonedHighlight;
          }
        }
      });
    },
    [highlightMaterial],
  );

  const removeHighlight = useCallback((component: THREE.Object3D) => {
    component.traverse((child) => {
      if (isMesh(child)) {
        const originalMaterial = originalMaterials.current.get(child);
        if (originalMaterial) {
          child.material = originalMaterial;
          originalMaterials.current.delete(child);
        }
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      restoreOriginalMaterials();
      setSelectedComponents([]);
      setMeshes([]);
    };
  }, [restoreOriginalMaterials, setMeshes]);

  const handleMeshClick = useCallback(
    (event: { stopPropagation: () => void; object: THREE.Mesh }) => {
      event.stopPropagation();
      const clickedMesh = event.object;
      if (!isMesh(clickedMesh)) return;

      const componentParent = clickedMesh.parent;
      if (!componentParent) return;

      const isSelected = selectedComponents.some(
        (comp) => comp.id === componentParent.id,
      );

      if (selectedTool === "Multi-Select") {
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
      } else {
        if (isSelected) {
          restoreOriginalMaterials();
          setSelectedComponents([]);
          updateSidebarMeshes([]);
        } else {
          restoreOriginalMaterials();
          setSelectedComponents([componentParent]);
          applyHighlight(componentParent);
          updateSidebarMeshes([componentParent]);
        }
      }
    },
    [
      selectedComponents,
      selectedTool,
      updateSidebarMeshes,
      applyHighlight,
      removeHighlight,
      restoreOriginalMaterials,
    ],
  );

  const handleMiss = useCallback(() => {
    if (selectedComponents.length > 0) {
      restoreOriginalMaterials();
      setSelectedComponents([]);
      updateSidebarMeshes([]);
    }
  }, [
    selectedComponents.length,
    restoreOriginalMaterials,
    updateSidebarMeshes,
  ]);

  const componentToControl = selectedComponents[0] as THREE.Mesh | undefined;

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
          />
        )}
      <group ref={groupRef}>
        <primitive
          object={scene}
          onClick={handleMeshClick}
          onPointerMissed={handleMiss}
        />
      </group>
    </>
  );
}
