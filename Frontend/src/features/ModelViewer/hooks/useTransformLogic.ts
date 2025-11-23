import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  MultiTransformCommand,
  type TransformState,
} from "@/features/ModelViewer/services/MultiTransformCommand.ts";
import {
  calculateSnap,
  detectCollisions,
  hasCollision,
  isMesh,
} from "@/features/ModelViewer/utils/ModelUtils.ts";
import { useHistory } from "@/features/ModelViewer/contexts/HistoryContext.tsx";
import { useNotification } from "@/shared/contexts/NotificationContext.tsx";
import { useModel } from "@/shared/contexts/ModelContext.tsx";

const _tempVec = new THREE.Vector3();

type TransformLogicProps = {
  selectedComponents: THREE.Object3D[];
  scene: THREE.Group | null;
  highlightMaterial: THREE.Material;
  updateSidebarMeshes: (selectedComponents: THREE.Object3D[]) => void;
  selectedComponentsRef: React.RefObject<THREE.Object3D[]>;
  selectedTool: string;
  collisionPrevention: boolean;
  saveMaterial: (mesh: THREE.Mesh) => void;
  restoreMaterial: (mesh: THREE.Mesh) => void;
  setOriginalMaterialOpacity: (mesh: THREE.Mesh, opacity: number) => void;
  isDraggingRef: React.RefObject<boolean>;
};

export const useTransformLogic = ({
  selectedComponents,
  scene,
  highlightMaterial,
  updateSidebarMeshes,
  selectedComponentsRef,
  selectedTool,
  collisionPrevention,
  saveMaterial,
  restoreMaterial,
  setOriginalMaterialOpacity,
  isDraggingRef,
}: Readonly<TransformLogicProps>) => {
  const initialOffsets = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  const initialRotations = useRef(new Map<THREE.Object3D, THREE.Quaternion>());
  const initialScales = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  const dragStartStates = useRef<TransformState[]>([]);
  const previousCollided = useRef<THREE.Object3D[]>([]);
  const prevLeaderWorldPos = useRef<THREE.Vector3 | null>(null);
  const currentLeaderId = useRef<number | null>(null);
  const { addCommand } = useHistory();
  const { showNotification } = useNotification();
  const {
    setMeshes,
    setUpdateMeshPosition,
    setToggleComponentVisibility,
    setToggleComponentOpacity,
  } = useModel();

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
    [selectedComponentsRef, updateSidebarMeshes],
  );

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartStates.current = getStates();
    if (selectedComponents.length > 0) {
      const leader = selectedComponents[0];
      leader.updateWorldMatrix(true, false);
      prevLeaderWorldPos.current = leader.position.clone();
    }
  }, [getStates, isDraggingRef, selectedComponents]);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 200);
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
              restoreMaterial(child);
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
            blueHighlight.opacity = state.opacity ?? 1;
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
    scene,
    getStates,
    isDraggingRef,
    selectedComponents,
    updateSidebarMeshes,
    restoreMaterial,
    highlightMaterial,
    onTransformComplete,
    addCommand,
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
        setOriginalMaterialOpacity(child, newOpacity);
      });

      setMeshes((prev) =>
        prev.map((m) =>
          m.id === componentId ? { ...m, opacity: newOpacity } : m,
        ),
      );
    },
    [
      selectedComponents,
      setMeshes,
      onTransformComplete,
      addCommand,
      setOriginalMaterialOpacity,
    ],
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
        _tempVec.lerpVectors(startPos, targetPos, t);
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

    if (scene && selectedTool === "Translate") {
      leader.updateWorldMatrix(true, true);

      const snapOffset = calculateSnap(leader, scene, selectedComponents, 0.1);

      if (snapOffset) {
        const currentWorldPos = new THREE.Vector3();
        leader.getWorldPosition(currentWorldPos);

        const snappedWorldPos = currentWorldPos.add(snapOffset);

        if (leader.parent) {
          leader.parent.updateWorldMatrix(true, false);
          leader.parent.worldToLocal(snappedWorldPos);
        }

        targetPos.copy(snappedWorldPos);
      }
    }

    leader.position.copy(prevLeaderWorldPos.current);
    leader.updateWorldMatrix(true, true);

    if (collisionPrevention && scene) {
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

    leader.updateWorldMatrix(true, true);
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
              restoreMaterial(child);
            }
          });
        }
      }

      for (const obj of collidedObjects) {
        obj.traverse((child) => {
          if (isMesh(child)) {
            saveMaterial(child);
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

    selectedComponents.forEach((comp) => {
      const elX = document.getElementById(
        `pos-x-${comp.id}`,
      ) as HTMLInputElement;
      const elY = document.getElementById(
        `pos-y-${comp.id}`,
      ) as HTMLInputElement;
      const elZ = document.getElementById(
        `pos-z-${comp.id}`,
      ) as HTMLInputElement;

      if (elX) elX.value = comp.position.x.toFixed(3);
      if (elY) elY.value = comp.position.y.toFixed(3);
      if (elZ) elZ.value = comp.position.z.toFixed(3);
    });
  }, [
    selectedComponents,
    scene,
    selectedTool,
    collisionPrevention,
    findSafeGroupPosition,
    restoreMaterial,
    saveMaterial,
    highlightMaterial,
  ]);

  return {
    handleDragStart,
    handleDragEnd,
    handleGizmoChange,
  };
};
