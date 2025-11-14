import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

type ModelProps = {
  processedUrl: string;
  setLoadingProgress: (progress: number) => void;
  selectedTool: string;
  setGroupRef: (ref: React.RefObject<THREE.Group | null>) => void;
  selectedVersion: StateFile | undefined;
};

export function Model({
  processedUrl,
  setLoadingProgress,
  selectedTool,
  selectedVersion,
  setGroupRef,
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

  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
  const selectedComponentsRef = useRef<THREE.Object3D[]>(selectedComponents);
  const originalMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
  );

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
    [],
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
            console.log("Scene state loaded successfully.");
          } else {
            console.error(
              "Loaded file is not a valid scene state:",
              parsedData,
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

    // --- Scene Normalization (Unchanged) ---
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const targetSize = 3;
    const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;
    clonedScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const center = scaledBox.getCenter(new THREE.Vector3());
    clonedScene.position.sub(center);

    // --- Helper Materials (Unchanged) ---
    const pointSlotHelperMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000, // Red
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });
    const areaSlotHelperMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });
    const lineSlotHelperMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff, // Blue
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    // --- Scene Traversal and Slot Creation ---
    clonedScene.traverse((node) => {
      // Clone materials
      if (isMesh(node)) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map((m) => m.clone());
        } else {
          node.material = node.material.clone();
        }
      }

      // Check for Slots userData
      if (node.userData.Slots && Array.isArray(node.userData.Slots)) {
        // --- 1. Get Component's Bounding Box (Unchanged) ---
        const localGeomBox = new THREE.Box3();

        if (isMesh(node) && node.geometry) {
          if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
          if (node.geometry.boundingBox) {
            localGeomBox.copy(node.geometry.boundingBox);
          }
        } else {
          node.traverse((child) => {
            if (isMesh(child) && child.geometry) {
              if (!child.geometry.boundingBox)
                child.geometry.computeBoundingBox();
              if (child.geometry.boundingBox) {
                const childBox = child.geometry.boundingBox.clone();
                childBox.applyMatrix4(child.matrixWorld);
                localGeomBox.union(childBox);
              }
            }
          });
          const invWorldMatrix = node.matrixWorld.clone().invert();
          if (!localGeomBox.isEmpty()) {
            localGeomBox.applyMatrix4(invWorldMatrix);
          }
        }

        const componentSize = localGeomBox.getSize(new THREE.Vector3());
        const boxCenter = localGeomBox.getCenter(new THREE.Vector3());
        let helperThickness;

        if (localGeomBox.isEmpty()) {
          helperThickness = 0.01 * targetSize;
        } else {
          helperThickness =
            Math.max(componentSize.x, componentSize.y, componentSize.z) * 0.01;
          if (helperThickness === 0) helperThickness = 0.01 * targetSize;
        }

        const mountingDesc = node.userData.MountingDescription;

        // --- 2. Iterate Slots and Create Helpers ---
        node.userData.Slots.forEach((slot) => {
          let slotHelperMesh: THREE.Object3D | undefined;
          let lineLength = 0;

          const { x, y, z } = slot.directionVector;
          const absX = Math.abs(x);
          const absY = Math.abs(y);
          const absZ = Math.abs(z);
          const targetVec = new THREE.Vector3(x, y, z).normalize();

          // --- Safe Justification Getters ---
          const justPoint = mountingDesc?.justificationOnPointSlots || {
            x: 0,
            y: 0,
            z: 0,
          };
          const justLine = mountingDesc?.justificationOnLineSlot
            ? { x: 0, ...mountingDesc.justificationOnLineSlot } // Ensure x exists
            : { x: 0, y: 0, z: 0 };
          const justAreaRaw = mountingDesc?.justificationOnAreaSlots;
          const justArea =
            typeof justAreaRaw === "object" && justAreaRaw !== null
              ? justAreaRaw
              : { x: 0, y: 0, z: 0 };

          // --- Check if justification is "non-zero" ---
          const pointIsJustified =
            justPoint.x !== 0 || justPoint.y !== 0 || justPoint.z !== 0;
          const lineIsJustified =
            justLine.x !== 0 || justLine.y !== 0 || justLine.z !== 0;
          const areaIsJustified =
            justArea.x !== 0 || justArea.y !== 0 || justArea.z !== 0;

          // --- 3. Create Geometry based on Type ---
          if (slot.type === "ModelAreaSlot") {
            let areaW: number, areaH: number;
            if (localGeomBox.isEmpty()) {
              areaW = 0.1 * targetSize;
              areaH = 0.1 * targetSize;
            } else {
              if (absX > absY && absX > absZ) {
                // X-axis
                areaW = componentSize.y;
                areaH = componentSize.z;
              } else if (absY > absX && absY > absZ) {
                // Y-axis
                areaW = componentSize.x;
                areaH = componentSize.z;
              } else {
                // Z-axis
                areaW = componentSize.x;
                areaH = componentSize.y;
              }
            }
            if (areaW === 0)
              areaW = Math.max(
                0.1 * targetSize,
                componentSize.x,
                componentSize.y,
                componentSize.z,
              );
            if (areaH === 0)
              areaH = Math.max(
                0.1 * targetSize,
                componentSize.x,
                componentSize.y,
                componentSize.z,
              );

            const geometry = new THREE.BoxGeometry(
              areaW,
              areaH,
              helperThickness,
            );
            slotHelperMesh = new THREE.Mesh(geometry, areaSlotHelperMaterial);

            // --- Positioning ---
            if (areaIsJustified) {
              slotHelperMesh.position.set(justArea.x, justArea.y, justArea.z);
            } else {
              // Auto-position on face center, offset by half thickness
              slotHelperMesh.position.set(
                boxCenter.x + x * (componentSize.x / 2 + helperThickness / 2),
                boxCenter.y + y * (componentSize.y / 2 + helperThickness / 2),
                boxCenter.z + z * (componentSize.z / 2 + helperThickness / 2),
              );
            }
          } else if (slot.type === "ModelLineSlot") {
            if (localGeomBox.isEmpty()) {
              lineLength = 0.5 * targetSize;
            } else {
              // Length is along the direction vector
              if (absX > absY && absX > absZ) {
                // X-axis
                lineLength = componentSize.x;
              } else if (absY > absX && absY > absZ) {
                // Y-axis
                lineLength = componentSize.y;
              } else {
                // Z-axis
                lineLength = componentSize.z;
              }
            }
            if (lineLength === 0) lineLength = 0.5 * targetSize;

            // Dimensions: X is length, Y/Z are thickness
            const geometry = new THREE.BoxGeometry(
              lineLength,
              helperThickness,
              helperThickness / 2,
            );
            // DO NOT translate geometry - this was the "intersect" bug

            slotHelperMesh = new THREE.Mesh(geometry, lineSlotHelperMaterial);

            // --- Positioning ---
            if (lineIsJustified) {
              slotHelperMesh.position.set(justLine.x, justLine.y, justLine.z);
            } else {
              // Auto-position based on user's rule (X/Y-dir -> Z-face, Z-dir -> X-face)
              const lineThickness = helperThickness / 2; // This is the Z-dim of the geometry

              if (absZ > absX && absZ > absY) {
                // Direction is Z-axis: Place on +X face
                slotHelperMesh.position.set(
                  boxCenter.x + componentSize.x / 2 + lineThickness / 2, // Offset by half line thickness
                  boxCenter.y,
                  boxCenter.z,
                );
              } else {
                // Direction is X or Y axis: Place on +Z face
                slotHelperMesh.position.set(
                  boxCenter.x,
                  boxCenter.y,
                  boxCenter.z + componentSize.z / 2 + lineThickness / 2, // Offset by half line thickness
                );
              }
            }
          } else if (slot.type === "ModelPointSlot") {
            const arrowLength = 60 * targetSize;
            const direction = new THREE.Vector3(x, y, z).normalize();
            const origin = new THREE.Vector3(0, 0, 0);

            const arrowHelper = new THREE.ArrowHelper(
              direction,
              origin,
              arrowLength,
              pointSlotHelperMaterial.color.getHex(),
              arrowLength * 0.5,
              arrowLength * 0.2,
            );

            (arrowHelper.line.material as THREE.MeshBasicMaterial).copy(
              pointSlotHelperMaterial,
            );
            (arrowHelper.cone.material as THREE.MeshBasicMaterial).copy(
              pointSlotHelperMaterial,
            );

            slotHelperMesh = arrowHelper;

            // --- Positioning ---
            if (pointIsJustified) {
              slotHelperMesh.position.set(
                justPoint.x,
                justPoint.y,
                justPoint.z,
              );
            } else {
              // Auto-position: Place arrow *base* on the face
              slotHelperMesh.position.set(
                boxCenter.x + (x * componentSize.x) / 2,
                boxCenter.y + (y * componentSize.y) / 2,
                boxCenter.z + (z * componentSize.z) / 2,
              );
            }
          }

          // --- 4. Orient and Add Helper to Node ---
          if (slotHelperMesh) {
            node.add(slotHelperMesh);

            if (slot.directionVector && targetVec.lengthSq() > 0.0001) {
              if (slot.type === "ModelAreaSlot") {
                const defaultNormal = new THREE.Vector3(0, 0, 1);
                slotHelperMesh.quaternion.setFromUnitVectors(
                  defaultNormal,
                  targetVec,
                );
              }
              if (slot.type === "ModelLineSlot") {
                const defaultDir = new THREE.Vector3(1, 0, 0); // Geometry's length is along its X-axis
                slotHelperMesh.quaternion.setFromUnitVectors(
                  defaultDir,
                  targetVec,
                );
              }
              // No orientation for ModelPointSlot, ArrowHelper handles it
            }
          }
        });
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
            if (foundOpacity !== undefined) return;
            if (isMesh(child)) {
              const saved = originalMaterials.current.get(child);
              if (saved) {
                if (Array.isArray(saved)) {
                  const first = saved[0];
                  foundOpacity = "opacity" in first ? (first.opacity ?? 1) : 1;
                } else {
                  foundOpacity = "opacity" in saved ? (saved.opacity ?? 1) : 1;
                }
              } else {
                const mat = child.material;
                if (Array.isArray(mat)) {
                  const first = mat[0];
                  foundOpacity = "opacity" in first ? (first.opacity ?? 1) : 1;
                } else {
                  foundOpacity = "opacity" in mat ? (mat.opacity ?? 1) : 1;
                }
              }
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
    dragStartStates.current = selectedComponents.map((comp) => ({
      position: comp.position.clone(),
      rotation: comp.quaternion.clone(),
      scale: comp.scale.clone(),
    }));
  }, [selectedComponents]);

  const handleDragEnd = useCallback(() => {
    const componentsForCommand = [...selectedComponents];
    const newStates = componentsForCommand.map((comp) => ({
      position: comp.position.clone(),
      rotation: comp.quaternion.clone(),
      scale: comp.scale.clone(),
    }));

    const oldStates = dragStartStates.current;

    if (oldStates.length > 0 && oldStates.length === newStates.length) {
      const onTransformComplete = (transformedObjects: THREE.Object3D[]) => {
        const currentSelection = selectedComponentsRef.current;
        const currentSelectionSet = new Set(currentSelection.map((c) => c.id));
        const shouldUpdate = transformedObjects.some((obj) =>
          currentSelectionSet.has(obj.id),
        );
        if (shouldUpdate) {
          updateSidebarMeshes(currentSelection);
        }
      };
      const command = new MultiTransformCommand(
        componentsForCommand,
        oldStates,
        newStates,
        onTransformComplete,
      );
      addCommand(command);
    }

    dragStartStates.current = [];
  }, [selectedComponents, updateSidebarMeshes, addCommand]);

  const toggleComponentVisibility = useCallback(
    (componentId: number, newVisibility: boolean) => {
      const componentToToggle = selectedComponents.find(
        (comp) => comp.id === componentId,
      );

      if (componentToToggle) {
        componentToToggle.visible = newVisibility;
      }

      setMeshes((prevMeshes) =>
        prevMeshes.map((mesh) =>
          mesh.id === componentId
            ? { ...mesh, isVisible: newVisibility }
            : mesh,
        ),
      );
    },
    [selectedComponents, setMeshes],
  );

  const updateMeshPosition = useCallback(
    (componentId: number, position: { x: number; y: number; z: number }) => {
      const object = selectedComponents.find((comp) => comp.id === componentId);
      if (!object) return;

      const oldState: TransformState = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
      };

      object.position.set(position.x, position.y, position.z);

      const newState: TransformState = {
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.clone(),
      };

      const command = new MultiTransformCommand(
        [object],
        [oldState],
        [newState],
        updateSidebarMeshes,
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
            : mesh,
        ),
      );
    },
    [selectedComponents, setMeshes, updateSidebarMeshes, addCommand],
  );

  const toggleComponentOpacity = useCallback(
    (componentId: number, newOpacity: number) => {
      const componentToChange = selectedComponents.find(
        (comp) => comp.id === componentId,
      );

      if (componentToChange) {
        componentToChange.traverse((child) => {
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
      }

      setMeshes((prevMeshes) =>
        prevMeshes.map((mesh) =>
          mesh.id === componentId ? { ...mesh, opacity: newOpacity } : mesh,
        ),
      );
    },
    [selectedComponents, setMeshes],
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
