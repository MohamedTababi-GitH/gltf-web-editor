import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cloneNodeMaterials, processNodeSlots } from "../utils/ModelUtils";

type SceneLoaderProps = {
  setLoadingProgress: (progress: number) => void;
  processedUrl: string;
  setGroupRef: (ref: React.RefObject<THREE.Group | null>) => void;
};

const emptyGroup = new THREE.Group();

export const useSceneLoader = ({
  setLoadingProgress,
  processedUrl,
  setGroupRef,
}: Readonly<SceneLoaderProps>) => {
  const groupRef = useRef<THREE.Group>(null);
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
    if (!gltf.scene) return emptyGroup;
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

    clonedScene.traverse((node: THREE.Object3D<THREE.Object3DEventMap>) => {
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

  return {
    scene,
    groupRef,
  };
};
