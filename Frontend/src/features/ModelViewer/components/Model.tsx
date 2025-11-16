import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { TransformControls } from "@react-three/drei";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  MultiTransformCommand,
  type TransformState,
} from "@/features/ModelViewer/services/MultiTransformCommand.ts";
import { useHistory } from "@/features/ModelViewer/contexts/HistoryContext.tsx";
import { type SavedComponentState } from "@/features/ModelViewer/utils/StateSaver.ts";
import { useAxiosConfig } from "@/shared/services/AxiosConfig.ts";
import type { StateFile } from "@/shared/types/StateFile.ts";
import { add } from "three/src/nodes/TSL.js";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

function detectCollisions(
  movedObject: THREE.Object3D,
  scene: THREE.Group,
  tolerance = 0.001
): THREE.Object3D[] {
  const collisions: THREE.Object3D[] = [];

  // Get world-space bounding box for the moved object
  const movedBox = new THREE.Box3().setFromObject(movedObject);

  scene.children.forEach((child) => {
    if (child === movedObject || !child.visible) return;
    const childBox = new THREE.Box3().setFromObject(child);
    if (
      movedBox.min.x <= childBox.max.x - tolerance &&
      movedBox.max.x >= childBox.min.x + tolerance &&
      movedBox.min.y <= childBox.max.y - tolerance &&
      movedBox.max.y >= childBox.min.y + tolerance &&
      movedBox.min.z <= childBox.max.z - tolerance &&
      movedBox.max.z >= childBox.min.z + tolerance
    ) {
      collisions.push(child);
    }
  });

  return collisions;
}

type ModelProps = {
  processedUrl: string;
  setLoadingProgress: (progress: number) => void;
  selectedTool: string;
  setGroupRef: (ref: React.RefObject<THREE.Group | null>) => void;
  selectedVersion: StateFile | undefined;
  collisionPrevention: boolean;
};

export function Model({
  processedUrl,
  setLoadingProgress,
  selectedTool,
  selectedVersion,
  setGroupRef,
  collisionPrevention,
}: Readonly<ModelProps>) {
  const {
    model,
    setMeshes,
    setToggleComponentVisibility,
    setToggleComponentOpacity,
    setUpdateMeshPosition,
  } = useModel();

  const groupRef = useRef<THREE.Group>(null);
  const initialOffsets = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  const initialRotations = useRef(new Map<THREE.Object3D, THREE.Quaternion>());
  const initialScales = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  const dragStartStates = useRef<TransformState[]>([]);
  const [loadedState, setLoadedState] = useState<SavedComponentState[]>();
  const { addCommand } = useHistory();
  const apiClient = useAxiosConfig();
  const previousCollided = useRef<THREE.Object3D[]>([]);
  const prevLeaderWorldPos = useRef<THREE.Vector3 | null>(null);

  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
  const selectedComponentsRef = useRef<THREE.Object3D[]>(selectedComponents);
  const originalMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
  );

  const onTransformComplete = (transformedObjects: THREE.Object3D[]) => {
    const currentSelection = selectedComponentsRef.current;
    const currentSelectionSet = new Set(currentSelection.map((c) => c.id));
    const shouldUpdate = transformedObjects.some((obj) =>
      currentSelectionSet.has(obj.id)
    );
    if (shouldUpdate) {
      updateSidebarMeshes(currentSelection);
    }
  };

  useEffect(() => {
    selectedComponentsRef.current = selectedComponents;
  }, [selectedComponents]);

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
    []
  );

  function isSavedStateArray(data: unknown): data is SavedComponentState[] {
    if (!Array.isArray(data)) {
      return false;
    }

    if (data.length > 0) {
      const item = data[0];
      return (
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "position" in item &&
        "rotation" in item &&
        "scale" in item &&
        "visible" in item &&
        "opacity" in item
      );
    }

    return true;
  }

  const handleLoadScene = useCallback((): void => {
    const files = model?.stateFiles;
    if (!files || files.length === 0) {
      return;
    }

    const versionToLoad = selectedVersion ?? files[0];

    if (!versionToLoad?.url) {
      console.error("Latest state file has no valid URL.");
      return;
    }

    const loadFromUrl = async () => {
      try {
        const response = await apiClient.get(versionToLoad.url, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        const jsonString = response.data;

        try {
          const parsedData: unknown =
            typeof jsonString === "string"
              ? JSON.parse(jsonString)
              : jsonString;

          if (isSavedStateArray(parsedData)) {
            setLoadedState(parsedData);
          } else {
            console.error(
              "Loaded file is not a valid scene state:",
              parsedData
            );
          }
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError, jsonString);
        }
      } catch (fetchError) {
        console.error("Failed to fetch state file:", fetchError);
      }
    };

    loadFromUrl();
  }, [apiClient, model?.stateFiles, selectedVersion]);

  useEffect(() => {
    handleLoadScene();
  }, [handleLoadScene]);

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
    if (groupRef.current && scene) {
      setGroupRef(groupRef);
    }
  }, [setGroupRef, scene]);

  const updateSidebarMeshes = useCallback(
    (components: THREE.Object3D[]) => {
      setMeshes(
        components.map((component) => {
          let opacity: number;

          let foundOpacity: number | undefined;
          component.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;

            const material = child.material;

            const getOpacity = (mat: THREE.Material) => {
              if ("opacity" in mat) {
                foundOpacity = mat.opacity;
              }
            };

            if (Array.isArray(material)) {
              material.forEach(getOpacity);
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
        })
      );
    },
    [setMeshes]
  );

  useEffect(() => {
    if (!loadedState || !scene) {
      return;
    }

    for (const savedComponent of loadedState) {
      const componentToLoad = scene.getObjectByName(savedComponent.name);

      if (componentToLoad) {
        componentToLoad.position.fromArray(savedComponent.position);

        componentToLoad.rotation.fromArray([
          savedComponent.rotation[0],
          savedComponent.rotation[1],
          savedComponent.rotation[2],
          "YXZ",
        ]);

        componentToLoad.scale.fromArray(savedComponent.scale);
        componentToLoad.visible = savedComponent.visible;

        componentToLoad.traverse((child) => {
          if (isMesh(child)) {
            const mat = child.material;
            if (Array.isArray(mat)) {
              for (const m of mat) {
                m.transparent = savedComponent.opacity < 1;
                m.opacity = savedComponent.opacity;
                m.needsUpdate = true;
              }
            } else {
              mat.transparent = savedComponent.opacity < 1;
              mat.opacity = savedComponent.opacity;
              mat.needsUpdate = true;
            }
          }
        });
      }
    }
  }, [loadedState, scene]);

  const handleDragStart = useCallback(() => {
    dragStartStates.current = selectedComponents.map((comp) => {
      // compute opacity
      const opacity = (() => {
        let op = 1;
        comp.traverse((child) => {
          if (isMesh(child) && op === 1) {
            const mat = child.material;
            op = Array.isArray(mat)
              ? (mat[0].opacity ?? 1)
              : (mat.opacity ?? 1);
          }
        });
        return op;
      })();

      return {
        position: comp.position.clone(),
        rotation: comp.quaternion.clone(),
        scale: comp.scale.clone(),
        isVisible: comp.visible,
        opacity,
      };
    });
  }, [selectedComponents]);

  const handleDragEnd = useCallback(() => {
    const componentsForCommand = [...selectedComponents];
    const newStates = componentsForCommand.map((comp) => {
      const opacity = (() => {
        let op = 1;
        comp.traverse((child) => {
          if (isMesh(child) && op === 1) {
            const mat = child.material;
            op = Array.isArray(mat)
              ? (mat[0].opacity ?? 1)
              : (mat.opacity ?? 1);
          }
        });
        return op;
      })();

      return {
        position: comp.position.clone(),
        rotation: comp.quaternion.clone(),
        scale: comp.scale.clone(),
        isVisible: comp.visible,
        opacity,
      };
    });

    const oldStates = dragStartStates.current;

    if (oldStates.length > 0 && oldStates.length === newStates.length) {
      const command = new MultiTransformCommand(
        componentsForCommand,
        oldStates,
        newStates,
        onTransformComplete
      );
      addCommand(command);
    }

    dragStartStates.current = [];
  }, [selectedComponents, updateSidebarMeshes, addCommand]);

  const toggleComponentVisibility = useCallback(
    (componentId: number, newVisibility: boolean) => {
      const componentToToggle = selectedComponents.find(
        (comp) => comp.id === componentId
      );
      if (!componentToToggle) return;

      // Build TransformState for undo/redo
      const oldState: TransformState = {
        position: componentToToggle.position.clone(),
        rotation: componentToToggle.quaternion.clone(),
        scale: componentToToggle.scale.clone(),
        isVisible: componentToToggle.visible,
        opacity: (() => {
          let op = 1;
          componentToToggle.traverse((child) => {
            if (isMesh(child) && op === 1) {
              const mat = child.material;
              op = Array.isArray(mat)
                ? (mat[0].opacity ?? 1)
                : (mat.opacity ?? 1);
            }
          });
          return op;
        })(),
      };

      const newState: TransformState = {
        position: componentToToggle.position.clone(),
        rotation: componentToToggle.quaternion.clone(),
        scale: componentToToggle.scale.clone(),
        isVisible: newVisibility,
        opacity: oldState.opacity,
      };

      // Create command for undo/redo
      const command = new MultiTransformCommand(
        [componentToToggle],
        [oldState],
        [newState],
        onTransformComplete
        /*
        () => {
          setMeshes((prev) =>
            prev.map((mesh) =>
              mesh.id === componentId
                ? { ...mesh, isVisible: newVisibility }
                : mesh
            )
          );
        }
        */
      );

      addCommand(command); // push to history
      command.execute(); // immediately apply change
    },
    [selectedComponents, setMeshes, addCommand]
  );

  const updateMeshPosition = useCallback(
    (componentId: number, position: { x: number; y: number; z: number }) => {
      const object = selectedComponents.find((comp) => comp.id === componentId);
      if (!object) return;

      const oldState: TransformState = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
        isVisible: object.visible,
        opacity: (() => {
          let op = 1;
          object.traverse((child) => {
            if (isMesh(child) && op === 1) {
              const mat = child.material;
              op = Array.isArray(mat)
                ? (mat[0].opacity ?? 1)
                : (mat.opacity ?? 1);
            }
          });
          return op;
        })(),
      };

      object.position.set(position.x, position.y, position.z);

      const newState: TransformState = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
        isVisible: object.visible,
        opacity: oldState.opacity,
      };

      const command = new MultiTransformCommand(
        [object],
        [oldState],
        [newState],
        onTransformComplete
      );
      addCommand(command);

      setMeshes((prevMeshes) =>
        prevMeshes.map((mesh) =>
          mesh.id === componentId
            ? {
                ...mesh,
                X: position.x.toFixed(3),
                Y: position.y.toFixed(3),
                Z: position.z.toFixed(3),
              }
            : mesh
        )
      );
    },
    [selectedComponents, setMeshes, updateSidebarMeshes, addCommand]
  );

  const toggleComponentOpacity = useCallback(
    (
      componentId: number,
      newOpacity: number,
      isCommit: boolean,
      oldOpacityValue?: number
    ) => {
      const object = selectedComponents.find((c) => c.id === componentId);
      if (!object) return;

      // ---- 1. Capture OLD state only on first commit ----
      if (isCommit && oldOpacityValue !== undefined) {
        const oldState: TransformState = {
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
          scale: object.scale.clone(),
          isVisible: object.visible,
          opacity: oldOpacityValue,
        };

        const newState: TransformState = {
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
          scale: object.scale.clone(),
          isVisible: object.visible,
          opacity: newOpacity,
        };

        const command = new MultiTransformCommand(
          [object],
          [oldState],
          [newState],
          onTransformComplete
        );

        addCommand(command);
      }

      // ---- 2. Live dragging → apply opacity with NO undo stack ----
      object.traverse((child) => {
        if (!isMesh(child)) return;
        const currentMaterial = child.material;
        const savedOriginal = originalMaterials.current.get(child);

        const updateOpacity = (mat: THREE.Material | THREE.Material[]) => {
          if (Array.isArray(mat)) {
            for (const m of mat) {
              m.transparent = true;
              m.opacity = newOpacity;
              m.needsUpdate = true;
            }
          } else {
            mat.transparent = true;
            mat.opacity = newOpacity;
            mat.needsUpdate = true;
          }
        };

        updateOpacity(currentMaterial);
        if (savedOriginal) updateOpacity(savedOriginal);
      });

      // Reflect in sidebar
      setMeshes((prev) =>
        prev.map((m) =>
          m.id === componentId ? { ...m, opacity: newOpacity } : m
        )
      );
    },
    [selectedComponents, setMeshes, updateSidebarMeshes, addCommand]
  );

  useEffect(() => {
    setToggleComponentVisibility(() => toggleComponentVisibility);
    setToggleComponentOpacity(() => toggleComponentOpacity);
    setUpdateMeshPosition(() => updateMeshPosition);
  }, [
    setToggleComponentVisibility,
    setToggleComponentOpacity,
    toggleComponentVisibility,
    toggleComponentOpacity,
    setUpdateMeshPosition,
    updateMeshPosition,
  ]);

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
          new THREE.Quaternion()
        );
        const rotationDelta = new THREE.Quaternion().copy(followerWorldRot);
        rotationDelta.premultiply(
          new THREE.Quaternion().copy(leaderWorldRot).invert()
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

    // only check collision after TransformControls updates leader’s position
    if (collisionPrevention) {
      const collisions = detectCollisions(leader, scene);
      if (collisions.length > 0) {
        // revert movement if colliding
        if (prevLeaderWorldPos.current) {
          leader.position.copy(prevLeaderWorldPos.current);
        }
        return; // stop followers this frame
      }
    }

    // ✅ always remember last good position
    prevLeaderWorldPos.current = leader.position.clone();

    leader.updateWorldMatrix(true, false);

    const leaderNewWorldPos = leader.getWorldPosition(new THREE.Vector3());
    const leaderNewWorldRot = leader.getWorldQuaternion(new THREE.Quaternion());
    const leaderNewWorldScale = leader.getWorldScale(new THREE.Vector3());

    for (let i = 1; i < selectedComponents.length; i++) {
      const follower = selectedComponents[i];

      // --- POSITION ---
      const offset = initialOffsets.current.get(follower);
      if (offset) {
        const newWorldPos = leaderNewWorldPos.clone().add(offset);
        if (collisionPrevention) {
          const originalPos = follower.getWorldPosition(new THREE.Vector3());
          follower.position.copy(newWorldPos);
          const collisions = detectCollisions(follower, scene);
          if (collisions.length > 0) {
            follower.position.copy(originalPos); // revert position if colliding
          } else {
            follower.parent?.updateWorldMatrix(true, false);
            follower.parent?.worldToLocal(newWorldPos);
            follower.position.copy(newWorldPos);
          }
        } else {
          follower.parent?.updateWorldMatrix(true, false);
          follower.parent?.worldToLocal(newWorldPos);
          follower.position.copy(newWorldPos);
        }
      }

      // --- ROTATION ---
      const rotationDelta = initialRotations.current.get(follower);
      if (rotationDelta) {
        const newWorldRot = new THREE.Quaternion()
          .copy(leaderNewWorldRot)
          .multiply(rotationDelta);
        const localRot = new THREE.Quaternion();
        follower.parent?.updateWorldMatrix(true, true);
        const parentWorldRotInv = follower.parent
          ? follower.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
          : new THREE.Quaternion();
        localRot.copy(newWorldRot).premultiply(parentWorldRotInv);

        if (collisionPrevention) {
          const originalRot = follower.quaternion.clone();
          follower.quaternion.copy(localRot);
          if (detectCollisions(follower, scene).length > 0) {
            follower.quaternion.copy(originalRot); // revert rotation if colliding
          }
        } else {
          follower.quaternion.copy(localRot);
        }
      }

      // --- SCALE ---
      const scaleRatio = initialScales.current.get(follower);
      if (scaleRatio) {
        const newWorldScale = leaderNewWorldScale.clone().multiply(scaleRatio);
        const parentWorldScale = follower.parent
          ? follower.parent.getWorldScale(new THREE.Vector3())
          : new THREE.Vector3(1, 1, 1);
        const localScale = newWorldScale.divide(parentWorldScale);

        if (collisionPrevention) {
          const originalScale = follower.scale.clone();
          follower.scale.copy(localScale);
          if (detectCollisions(follower, scene).length > 0) {
            follower.scale.copy(originalScale); // revert scale if colliding
          }
        } else {
          follower.scale.copy(localScale);
        }
      }
    }

    // --- HIGHLIGHT COLLISIONS (unchanged) ---
    if (scene && leader) {
      const collidedObjects: THREE.Object3D[] = [];
      selectedComponents.forEach((comp) => {
        collidedObjects.push(...detectCollisions(comp, scene));
      });

      previousCollided.current.forEach((obj) => {
        if (!collidedObjects.includes(obj)) {
          obj.traverse((child) => {
            if (isMesh(child)) {
              const original = originalMaterials.current.get(child);
              if (original) {
                child.material = original;
                originalMaterials.current.delete(child);
              }
            }
          });
        }
      });

      collidedObjects.forEach((obj) => {
        obj.traverse((child) => {
          if (isMesh(child)) {
            if (!originalMaterials.current.has(child)) {
              originalMaterials.current.set(child, child.material);
            }
            const highlight = (
              child.material as THREE.MeshStandardMaterial
            ).clone();
            highlight.color.set("red");
            child.material = highlight;
          }
        });
      });

      selectedComponents.forEach((component) => {
        const collisions = detectCollisions(component, scene);
        const isColliding = collisions.length > 0;

        component.traverse((child) => {
          if (!isMesh(child)) return;
          if (isColliding) {
            const collisionMat = (
              child.material as THREE.MeshStandardMaterial
            ).clone();
            collisionMat.emissive = new THREE.Color("#ff6f91");
            collisionMat.emissiveIntensity = 0.8;
            child.material = collisionMat;
          } else {
            const highlight = highlightMaterial.clone();
            if ("opacity" in child.material)
              highlight.opacity = child.material.opacity ?? 1;
            child.material = highlight;
          }
        });
      });

      previousCollided.current = collidedObjects;
    }

    updateSidebarMeshes(selectedComponents);
  }, [
    selectedComponents,
    updateSidebarMeshes,
    scene,
    collisionPrevention,
    highlightMaterial,
  ]);

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
            originalMaterials.current.set(child, child.material);

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
    [highlightMaterial]
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
        (comp) => comp.id === componentParent.id
      );

      if (selectedTool === "Multi-Select") {
        if (isSelected) {
          const newSelection = selectedComponents.filter(
            (comp) => comp.id !== componentParent.id
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
        restoreOriginalMaterials();
        setSelectedComponents([]);
        updateSidebarMeshes([]);
      } else {
        restoreOriginalMaterials();
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
      restoreOriginalMaterials,
    ]
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
