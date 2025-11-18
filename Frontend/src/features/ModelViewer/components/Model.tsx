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
import { useNotification } from "@/shared/contexts/NotificationContext.tsx";

// eslint-disable-next-line react-refresh/only-export-components
export function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

type Slot = {
  type: "ModelPointSlot" | "ModelLineSlot" | "ModelAreaSlot";
  directionVector: { x: number; y: number; z: number };
};

const pointSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const areaSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const lineSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

function cloneNodeMaterials(node: THREE.Object3D) {
  if (isMesh(node)) {
    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => m.clone());
    } else {
      node.material = node.material.clone();
    }
  }
}

function getLocalBoundingBox(node: THREE.Object3D): THREE.Box3 {
  const localGeomBox = new THREE.Box3();

  if (isMesh(node) && node.geometry) {
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    if (node.geometry.boundingBox) {
      localGeomBox.copy(node.geometry.boundingBox);
    }
  } else {
    node.traverse((child) => {
      if (isMesh(child) && child.geometry) {
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        if (child.geometry.boundingBox) {
          const childBox = child.geometry.boundingBox.clone();
          childBox.applyMatrix4(child.matrixWorld);
          localGeomBox.union(childBox);
        }
      }
    });

    if (!localGeomBox.isEmpty()) {
      const invWorldMatrix = node.matrixWorld.clone().invert();
      localGeomBox.applyMatrix4(invWorldMatrix);
    }
  }
  return localGeomBox;
}

function getJustifications(mountingDesc: {
  justificationOnPointSlots: { x: number; y: number; z: number };
  justificationOnLineSlot: { y: number; z: number };
  justificationOnAreaSlots: number;
}) {
  const justPoint = mountingDesc?.justificationOnPointSlots || {
    x: 0,
    y: 0,
    z: 0,
  };
  const justLine = mountingDesc?.justificationOnLineSlot
    ? { x: 0, ...mountingDesc.justificationOnLineSlot }
    : { x: 0, y: 0, z: 0 };
  const justAreaRaw = mountingDesc?.justificationOnAreaSlots;
  const justArea =
    typeof justAreaRaw === "object" && justAreaRaw !== null
      ? justAreaRaw
      : { x: 0, y: 0, z: 0 };

  return {
    point: justPoint,
    line: justLine,
    area: justArea,
    pointIsJustified:
      justPoint.x !== 0 || justPoint.y !== 0 || justPoint.z !== 0,
    lineIsJustified: justLine.x !== 0 || justLine.y !== 0 || justLine.z !== 0,
    areaIsJustified: justArea.x !== 0 || justArea.y !== 0 || justArea.z !== 0,
  };
}

function getHelperThickness(
  box: THREE.Box3,
  size: THREE.Vector3,
  targetSize: number,
): number {
  let thickness;
  if (box.isEmpty()) {
    thickness = 0.01 * targetSize;
  } else {
    thickness = Math.max(size.x, size.y, size.z) * 0.01;
    if (thickness === 0) thickness = 0.01 * targetSize;
  }
  return thickness;
}

function createAreaSlot(context: SlotContext): THREE.Mesh {
  const { componentSize, helperThickness, targetSize, slot } = context;
  const { x, y, z } = slot.directionVector;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);

  let areaW: number, areaH: number;
  if (context.localGeomBox.isEmpty()) {
    areaW = 0.1 * targetSize;
    areaH = 0.1 * targetSize;
  } else if (absX > absY && absX > absZ) {
    areaW = componentSize.y;
    areaH = componentSize.z;
  } else if (absY > absX && absY > absZ) {
    areaW = componentSize.x;
    areaH = componentSize.z;
  } else {
    areaW = componentSize.x;
    areaH = componentSize.y;
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

  const geometry = new THREE.BoxGeometry(areaW, areaH, helperThickness);
  return new THREE.Mesh(geometry, areaSlotHelperMaterial);
}

function createLineSlot(context: SlotContext): THREE.Mesh {
  const { componentSize, helperThickness, targetSize, slot } = context;
  const { x, y, z } = slot.directionVector;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);

  let lineLength;
  if (context.localGeomBox.isEmpty()) {
    lineLength = 0.5 * targetSize;
  } else if (absX > absY && absX > absZ) {
    lineLength = componentSize.x;
  } else if (absY > absX && absY > absZ) {
    lineLength = componentSize.y;
  } else {
    lineLength = componentSize.z;
  }
  if (lineLength === 0) lineLength = 0.5 * targetSize;

  const geometry = new THREE.BoxGeometry(
    lineLength,
    helperThickness,
    helperThickness / 2,
  );
  return new THREE.Mesh(geometry, lineSlotHelperMaterial);
}

function createPointSlot(context: SlotContext): THREE.ArrowHelper {
  const { targetVec, targetSize } = context;

  const arrowLength = 60 * targetSize;
  const origin = new THREE.Vector3(0, 0, 0);

  const arrowHelper = new THREE.ArrowHelper(
    targetVec,
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

  return arrowHelper;
}

function setSlotHelperPosition(
  slotHelperMesh: THREE.Object3D,
  context: SlotContext,
) {
  const { slot, justifications, boxCenter, componentSize, helperThickness } =
    context;
  const { x, y, z } = slot.directionVector;

  switch (slot.type) {
    case "ModelAreaSlot":
      if (justifications.areaIsJustified) {
        slotHelperMesh.position.set(
          justifications.area.x,
          justifications.area.y,
          justifications.area.z,
        );
      } else {
        slotHelperMesh.position.set(
          boxCenter.x + x * (componentSize.x / 2 + helperThickness / 2),
          boxCenter.y + y * (componentSize.y / 2 + helperThickness / 2),
          boxCenter.z + z * (componentSize.z / 2 + helperThickness / 2),
        );
      }
      break;

    case "ModelLineSlot":
      if (justifications.lineIsJustified) {
        slotHelperMesh.position.set(
          justifications.line.x,
          justifications.line.y,
          justifications.line.z,
        );
      } else {
        const lineThickness = helperThickness / 2;
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);
        if (absZ > absX && absZ > absY) {
          slotHelperMesh.position.set(
            boxCenter.x + componentSize.x / 2 + lineThickness / 2,
            boxCenter.y,
            boxCenter.z,
          );
        } else {
          slotHelperMesh.position.set(
            boxCenter.x,
            boxCenter.y,
            boxCenter.z + componentSize.z / 2 + lineThickness / 2,
          );
        }
      }
      break;

    case "ModelPointSlot":
      if (justifications.pointIsJustified) {
        slotHelperMesh.position.set(
          justifications.point.x,
          justifications.point.y,
          justifications.point.z,
        );
      } else {
        slotHelperMesh.position.set(
          boxCenter.x + (x * componentSize.x) / 2,
          boxCenter.y + (y * componentSize.y) / 2,
          boxCenter.z + (z * componentSize.z) / 2,
        );
      }
      break;
  }
}

function setSlotHelperOrientation(
  slotHelperMesh: THREE.Object3D,
  context: SlotContext,
) {
  const { slot, targetVec } = context;

  if (targetVec.lengthSq() < 0.0001) return;

  if (slot.type === "ModelAreaSlot") {
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    slotHelperMesh.quaternion.setFromUnitVectors(defaultNormal, targetVec);
  } else if (slot.type === "ModelLineSlot") {
    const defaultDir = new THREE.Vector3(1, 0, 0);
    slotHelperMesh.quaternion.setFromUnitVectors(defaultDir, targetVec);
  }
}

function processNodeSlots(node: THREE.Object3D, targetSize: number): void {
  if (!node.userData.Slots || !Array.isArray(node.userData.Slots)) {
    return;
  }

  const localGeomBox = getLocalBoundingBox(node);
  const componentSize = localGeomBox.getSize(new THREE.Vector3());
  const boxCenter = localGeomBox.getCenter(new THREE.Vector3());
  const helperThickness = getHelperThickness(
    localGeomBox,
    componentSize,
    targetSize,
  );

  const mountingDesc = node.userData.MountingDescription;
  const justifications = getJustifications(mountingDesc);

  for (const slot of node.userData.Slots) {
    const { x, y, z } = slot.directionVector;
    const targetVec = new THREE.Vector3(x, y, z).normalize();

    const context: SlotContext = {
      slot,
      localGeomBox,
      componentSize,
      boxCenter,
      helperThickness,
      targetSize,
      justifications,
      targetVec,
    };

    let slotHelperMesh: THREE.Object3D | undefined;
    switch (slot.type) {
      case "ModelAreaSlot":
        slotHelperMesh = createAreaSlot(context);
        break;
      case "ModelLineSlot":
        slotHelperMesh = createLineSlot(context);
        break;
      case "ModelPointSlot":
        slotHelperMesh = createPointSlot(context);
        break;
    }

    if (slotHelperMesh) {
      slotHelperMesh.traverse((child) => {
        child.userData.isSlot = true;
      });
      setSlotHelperPosition(slotHelperMesh, context);
      setSlotHelperOrientation(slotHelperMesh, context);
      node.add(slotHelperMesh);
    }
  }
}

type SlotContext = {
  slot: Slot;
  localGeomBox: THREE.Box3;
  componentSize: THREE.Vector3;
  boxCenter: THREE.Vector3;
  helperThickness: number;
  targetSize: number;
  justifications: ReturnType<typeof getJustifications>;
  targetVec: THREE.Vector3;
};

const _tempBox = new THREE.Box3();
const _childBox = new THREE.Box3();
const _movedBox = new THREE.Box3();
const _tempVec = new THREE.Vector3();

function detectCollisions(
  movedObject: THREE.Object3D,
  scene: THREE.Group,
  ignoreList: THREE.Object3D[] = [],
  tolerance = -0.001,
): THREE.Object3D[] {
  const collisions: THREE.Object3D[] = [];

  // 1. Use setFromObject on the reusable box
  _movedBox.setFromObject(movedObject);

  scene.traverse((child) => {
    if (!child.visible) return;
    if (child === movedObject) return;
    if (movedObject.getObjectById(child.id)) return; // Ignore descendants
    if (child.userData.isSlot) return; // Ignore slots

    // Fast check: Is it in the ignore list?
    const isIgnored = ignoreList.some(
      (ignoredObj) =>
        ignoredObj === child || ignoredObj.getObjectById(child.id),
    );
    if (isIgnored) return;

    if (!isMesh(child)) return;

    // 2. Use setFromObject on the reusable child box
    _childBox.setFromObject(child);

    // 3. Expand temp box for tolerance check
    _tempBox.copy(_movedBox).expandByScalar(tolerance);

    if (_tempBox.intersectsBox(_childBox)) {
      collisions.push(child);
    }
  });

  return collisions;
}

function hasCollision(
  movedObject: THREE.Object3D,
  scene: THREE.Group,
  ignoreList: THREE.Object3D[],
  tolerance = -0.001,
): boolean {
  _movedBox.setFromObject(movedObject);
  _movedBox.expandByScalar(tolerance);

  let collisionFound = false;

  scene.traverse((child) => {
    if (collisionFound) return;
    if (!child.visible) return;
    if (child === movedObject) return;
    if (movedObject.getObjectById(child.id)) return;
    if (child.userData.isSlot) return;

    const isIgnored = ignoreList.some(
      (ignoredObj) =>
        ignoredObj === child || ignoredObj.getObjectById(child.id),
    );
    if (isIgnored) return;

    if (!isMesh(child)) return;

    _childBox.setFromObject(child);

    if (_movedBox.intersectsBox(_childBox)) {
      collisionFound = true;
    }
  });

  return collisionFound;
}

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
  const currentLeaderId = useRef<number | null>(null);
  const { showNotification } = useNotification();

  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
  const selectedComponentsRef = useRef<THREE.Object3D[]>(selectedComponents);
  const originalMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
  );
  const originalDiffMaterials = useRef(
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

  const handleLoadScene = useCallback(async (): Promise<void> => {
    const files = model?.stateFiles;
    if (!files || files.length === 0) {
      return;
    }
    const sortedFiles = [...files].sort((a, b) =>
      a.createdOn > b.createdOn ? -1 : 1,
    );

    const versionExists =
      selectedVersion?.version === "Original"
        ? true
        : sortedFiles.some((file) => file.version === selectedVersion?.version);
    const versionToLoad = versionExists ? selectedVersion : sortedFiles[0];
    setSelectedVersion(versionToLoad);

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

    await loadFromUrl();
  }, [apiClient, model?.stateFiles, selectedVersion, setSelectedVersion]);

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

    clonedScene.traverse((node) => {
      cloneNodeMaterials(node);
      processNodeSlots(node, targetSize);
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

  const onTransformComplete = useCallback(
    (transformedObjects: THREE.Object3D[]) => {
      const currentSelection = selectedComponentsRef.current;
      const currentSelectionSet = new Set(currentSelection.map((c) => c.id));
      const shouldUpdate = transformedObjects.some((obj) =>
        currentSelectionSet.has(obj.id),
      );
      if (shouldUpdate) {
        updateSidebarMeshes(currentSelection);
      }
    },
    [updateSidebarMeshes],
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

  const getStates = useCallback(() => {
    return selectedComponents.map((comp) => {
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

  const handleDragStart = useCallback(() => {
    dragStartStates.current = getStates();
    if (selectedComponents.length > 0) {
      const leader = selectedComponents[0];
      leader.updateWorldMatrix(true, false);
      prevLeaderWorldPos.current = leader.position.clone();
    }
  }, [getStates, selectedComponents]);

  const handleDragEnd = useCallback(() => {
    let isColliding = false;
    if (scene) {
      for (const comp of selectedComponents) {
        if (hasCollision(comp, scene, selectedComponents)) {
          isColliding = true;
          break;
        }
      }
    }

    const oldStates = dragStartStates.current;

    if (isColliding && oldStates.length > 0) {
      if (previousCollided.current.length > 0) {
        previousCollided.current.forEach((obj) => {
          obj.traverse((child) => {
            if (isMesh(child)) {
              const original = originalMaterials.current.get(child);
              if (original) {
                child.material = original;
                originalMaterials.current.delete(child);
              }
            }
          });
        });
        previousCollided.current = [];
      }

      selectedComponents.forEach((comp, index) => {
        const state = oldStates[index];
        if (!state) return;

        comp.position.copy(state.position);
        comp.quaternion.copy(state.rotation);
        comp.scale.copy(state.scale);
        comp.visible = state.isVisible;

        comp.traverse((child) => {
          if (isMesh(child)) {
            const blueHighlight = highlightMaterial.clone();
            const baseOpacity = state.opacity ?? 1;
            blueHighlight.opacity = baseOpacity < 1 ? baseOpacity : 0.9;
            child.material = blueHighlight;
          }
        });
      });

      updateSidebarMeshes(selectedComponents);
      dragStartStates.current = [];
      return;
    }

    const newStates = getStates();

    if (oldStates.length > 0 && oldStates.length === newStates.length) {
      const command = new MultiTransformCommand(
        selectedComponents,
        oldStates,
        newStates,
        onTransformComplete,
      );
      addCommand(command);
    }

    dragStartStates.current = [];
  }, [
    selectedComponents,
    getStates,
    onTransformComplete,
    addCommand,
    scene,
    updateSidebarMeshes,
    highlightMaterial,
  ]);

  const toggleComponentVisibility = useCallback(
    (componentId: number, newVisibility: boolean) => {
      const componentToToggle = selectedComponents.find(
        (comp) => comp.id === componentId,
      );
      if (!componentToToggle) return;

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

      const command = new MultiTransformCommand(
        [componentToToggle],
        [oldState],
        [newState],
        onTransformComplete,
      );

      addCommand(command);
      command.execute();
    },
    [selectedComponents, onTransformComplete, addCommand],
  );

  const updateMeshPosition = useCallback(
    (componentId: number, position: { x: number; y: number; z: number }) => {
      const object = selectedComponents.find((comp) => comp.id === componentId);
      if (!object) return;

      const originalPos = object.position.clone();

      object.position.set(position.x, position.y, position.z);
      object.updateWorldMatrix(true, false);

      if (scene && hasCollision(object, scene, selectedComponents)) {
        showNotification(
          "Collision Detected! Position update blocked.",
          "error",
        );
        object.position.copy(originalPos);
        object.updateWorldMatrix(true, false);
        return;
      }

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
        onTransformComplete,
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
    [
      selectedComponents,
      scene,
      onTransformComplete,
      addCommand,
      setMeshes,
      showNotification,
    ],
  );

  const toggleComponentOpacity = useCallback(
    (
      componentId: number,
      newOpacity: number,
      isCommit: boolean,
      oldOpacityValue?: number,
    ) => {
      const object = selectedComponents.find((c) => c.id === componentId);
      if (!object) return;

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
          onTransformComplete,
        );

        addCommand(command);
      }

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

      setMeshes((prev) =>
        prev.map((m) =>
          m.id === componentId ? { ...m, opacity: newOpacity } : m,
        ),
      );
    },
    [selectedComponents, setMeshes, onTransformComplete, addCommand],
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

      prevLeaderWorldPos.current = leader.position.clone();

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
    } else {
      prevLeaderWorldPos.current = null;
    }
  }, [selectedComponents]);

  const findSafeGroupPosition = useCallback(
    (
      leader: THREE.Object3D,
      followers: THREE.Object3D[],
      startPos: THREE.Vector3,
      targetPos: THREE.Vector3,
      scene: THREE.Group,
      ignoreList: THREE.Object3D[],
    ) => {
      if (startPos.distanceToSquared(targetPos) < 0.000001) return startPos;

      let low = 0;
      let high = 1;
      let bestSafeT = 0;
      const iterations = 4;

      const checkGroupSafety = (t: number): boolean => {
        _tempVec.lerpVectors(startPos, targetPos, t); // Reuse _tempVec
        leader.position.copy(_tempVec);
        leader.updateWorldMatrix(true, false);

        if (hasCollision(leader, scene, ignoreList)) return false;

        const leaderWorldPos = _tempVec.setFromMatrixPosition(
          leader.matrixWorld,
        );

        for (const follower of followers) {
          const offset = initialOffsets.current.get(follower);
          if (offset) {
            const targetFollowerWorld = leaderWorldPos.clone().add(offset);

            follower.parent?.updateWorldMatrix(true, false);
            follower.parent?.worldToLocal(targetFollowerWorld);

            const oldFollowerPos = follower.position.clone();
            follower.position.copy(targetFollowerWorld);
            follower.updateWorldMatrix(true, false);

            const isColliding = hasCollision(follower, scene, ignoreList);

            follower.position.copy(oldFollowerPos);

            if (isColliding) return false;
          }
        }
        return true;
      };

      for (let i = 0; i < iterations; i++) {
        const mid = (low + high) / 2;
        if (checkGroupSafety(mid)) {
          bestSafeT = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      return new THREE.Vector3().lerpVectors(startPos, targetPos, bestSafeT);
    },
    [initialOffsets],
  );

  const handleGizmoChange = useCallback(() => {
    const leader = selectedComponents[0];
    if (!leader) return;
    if (currentLeaderId.current !== leader.id) {
      currentLeaderId.current = leader.id;
      prevLeaderWorldPos.current = leader.position.clone();
      return;
    }
    const targetPos = leader.position.clone();

    if (!prevLeaderWorldPos.current) {
      prevLeaderWorldPos.current = targetPos.clone();
    }

    leader.position.copy(prevLeaderWorldPos.current);
    leader.updateWorldMatrix(true, false);

    if (collisionPrevention) {
      const safePos = findSafeGroupPosition(
        leader,
        selectedComponents.slice(1),
        prevLeaderWorldPos.current,
        targetPos,
        scene,
        selectedComponents,
      );
      leader.position.copy(safePos);
    } else {
      leader.position.copy(targetPos);
    }

    leader.updateWorldMatrix(true, false);
    prevLeaderWorldPos.current = leader.position.clone();

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
        const newWorldRot = new THREE.Quaternion()
          .copy(leaderNewWorldRot)
          .multiply(rotationDelta);
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

    if (scene && leader) {
      const collidedObjects: THREE.Object3D[] = [];
      for (const comp of selectedComponents) {
        collidedObjects.push(
          ...detectCollisions(comp, scene, selectedComponents),
        );
      }

      for (const obj of previousCollided.current) {
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
      }

      for (const obj of collidedObjects) {
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
      }

      for (const component of selectedComponents) {
        const collisions = detectCollisions(
          component,
          scene,
          selectedComponents,
        );
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
      }

      previousCollided.current = collidedObjects;
    }

    updateSidebarMeshes(selectedComponents);
  }, [
    selectedComponents,
    collisionPrevention,
    scene,
    updateSidebarMeshes,
    findSafeGroupPosition,
    highlightMaterial,
  ]);

  const restoreOriginalMaterials = useCallback(() => {
    for (const [mesh, material] of originalMaterials.current) {
      mesh.material = material;
    }
    originalMaterials.current.clear();
  }, []);
  const restoreOriginalDiffMaterials = useCallback(() => {
    for (const [mesh, material] of originalDiffMaterials.current) {
      if (!originalMaterials.current.has(mesh)) {
        mesh.material = material;
      }
    }
    originalDiffMaterials.current.clear();
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
    [highlightMaterial],
  );

  const removeHighlight = useCallback(
    (component: THREE.Object3D) => {
      const isDiffed = diffNodeIds && diffNodeIds.includes(component.name);
      component.traverse((child) => {
        if (isMesh(child)) {
          const originalMaterial = originalMaterials.current.get(child);
          if (originalMaterial) {
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
            originalMaterials.current.delete(child);
          }
        }
      });
    },
    [diffNodeIds],
  );

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
        removeHighlight(componentParent);
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

  const componentToControl = selectedComponents[0];

  useEffect(() => {
    if (!diffNodeIds || diffNodeIds.length === 0) {
      if (isComparing) {
        console.log("Resetting Diff");
        restoreOriginalDiffMaterials();
        setIsComparing(false);
      }
      return;
    }

    for (const obj of scene.children) {
      const id = obj.name;

      if (id && diffNodeIds.includes(id)) {
        obj.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const mesh = child as THREE.Mesh;
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
  ]);

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
