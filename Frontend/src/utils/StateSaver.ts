import React from "react";
import * as THREE from "three";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

function getComponentOpacity(component: THREE.Object3D): number {
  let foundOpacity = 1;
  component.traverse((child) => {
    if (foundOpacity !== 1) return;

    if (isMesh(child)) {
      const mat = child.material;
      if (Array.isArray(mat)) {
        if (mat.length > 0) {
          foundOpacity = mat[0].opacity;
        }
      } else {
        foundOpacity = mat.opacity;
      }
    }
  });
  return foundOpacity;
}

export type SavedComponentState = {
  name: string;
  position: THREE.Vector3Tuple;
  rotation: THREE.Vector3Tuple;
  scale: THREE.Vector3Tuple;
  visible: boolean;
  opacity: number;
};

export const handleSaveScene = (
  groupRef: React.RefObject<THREE.Group | null>,
): string => {
  if (!groupRef.current || !groupRef.current.children[0]) {
    console.error("Scene not ready to save.");
    return "[]";
  }

  const scene = groupRef.current.children[0];
  const savedComponentData: SavedComponentState[] = [];

  scene.children.forEach((component) => {
    if (component.isObject3D) {
      const euler = new THREE.Euler().setFromQuaternion(
        component.quaternion,
        "YXZ",
      );
      const rotation: THREE.Vector3Tuple = [euler.x, euler.y, euler.z];

      savedComponentData.push({
        name: component.name,
        position: component.position.toArray(),
        rotation: rotation,
        scale: component.scale.toArray(),
        visible: component.visible,
        opacity: getComponentOpacity(component),
      });
    }
  });

  return JSON.stringify(savedComponentData);
};
