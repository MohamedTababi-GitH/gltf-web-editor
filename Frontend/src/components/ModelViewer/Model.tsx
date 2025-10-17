import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useModel } from "@/contexts/ModelContext";
import * as THREE from "three";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

function ListMeshes(scene: THREE.Group) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (isMesh(child)) {
      meshes.push(child);
    }
  });
  meshes[0].material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  return meshes;
}

export function Model() {
  const groupRef = useRef(null);
  const { url } = useModel();
  const gltf = useGLTF(url || "");
  const scene = gltf.scene;
  ListMeshes(scene);

  useEffect(() => {
    if (!url) return;
    useGLTF.preload(url);
  }, [url]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
