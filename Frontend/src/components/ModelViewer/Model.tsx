import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { TransformControls, useGLTF } from "@react-three/drei";
import { useModel } from "@/contexts/ModelContext";
import * as THREE from "three";
import type { MeshData } from "@/types/ModelItem";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}

function ListMeshes(scene: THREE.Group): MeshData[] {
  const meshes: MeshData[] = [];
  scene.traverse((child) => {
    if (isMesh(child)) {
      meshes.push({
        name: child.name,
        id: child.id,
        X: child.position.x.toFixed(3),
        Y: child.position.y.toFixed(3),
        Z: child.position.z.toFixed(3),
      });
    }
  });
  return meshes;
}

export function Model() {
  const { url, setMeshes } = useModel();

  const groupRef = useRef<THREE.Group>(null);
  const [selectedComponent, setSelectedComponent] = useState<THREE.Mesh | null>(
    null
  );
  const [originalMaterials, setOriginalMaterials] = useState(new Map());

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

  const gltf = useGLTF(url || "", false);

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

    return clonedScene;
  }, [url, gltf.scene]);

  useEffect(() => {
    if (scene && setMeshes) {
      const meshes = ListMeshes(scene);
      console.log("Initial Meshes Loaded:", meshes);
      setMeshes(meshes);
    }
    return () => {
      if (setMeshes) setMeshes([]);
    };
  }, [scene, setMeshes]);

  const handleGizmoChange = useCallback(() => {
    console.log("--- GIZMO MOVE DETECTED ---");

    if (scene && setMeshes) {
      const updatedMeshes = ListMeshes(scene);

      const movedMesh = updatedMeshes.find(
        (m) => m.id === selectedComponent?.id
      );
      console.log(
        "Moved Mesh New Position:",
        movedMesh?.name,
        movedMesh?.X,
        movedMesh?.Y,
        movedMesh?.Z
      );

      setMeshes(updatedMeshes);
    }
  }, [scene, setMeshes, selectedComponent]);

  const restoreOriginalMaterials = () => {
    if (originalMaterials.size > 0) {
      originalMaterials.forEach((material, mesh) => {
        mesh.material = material;
      });
    }
  };

  const handleMeshClick = (event: any) => {
    event.stopPropagation();
    const clickedMesh = event.object as THREE.Mesh;
    if (!isMesh(clickedMesh)) return;
    restoreOriginalMaterials();

    if (selectedComponent === clickedMesh) {
      setSelectedComponent(null);
      setOriginalMaterials(new Map());
    } else {
      const newMaterialsMap = new Map();
      newMaterialsMap.set(clickedMesh, clickedMesh.material);
      clickedMesh.material = highlightMaterial;
      setSelectedComponent(clickedMesh);
      setOriginalMaterials(newMaterialsMap);
    }
  };

  const handleMiss = () => {
    restoreOriginalMaterials();
    setSelectedComponent(null);
    setOriginalMaterials(new Map());
  };

  return (
    <>
      {selectedComponent && (
        <TransformControls
          object={selectedComponent}
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
