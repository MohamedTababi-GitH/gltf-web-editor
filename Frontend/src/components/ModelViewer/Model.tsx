import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { TransformControls } from "@react-three/drei";
import { useModel } from "@/contexts/ModelContext";
import * as THREE from "three";
import type { MeshData } from "@/types/ModelItem";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

export function Model({
  processedUrl,
  setLoadingProgress,
  selectedTool,
}: {
  processedUrl: string;
  setLoadingProgress: (progress: number) => void;
  selectedTool: string;
}) {
  const { setMeshes } = useModel();

  const groupRef = useRef<THREE.Group>(null);
  const [selectedComponent, setSelectedComponent] = useState<THREE.Mesh | null>(
    null,
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
    [],
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

    return clonedScene;
  }, [gltf.scene]);

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
        (m) => m.id === selectedComponent?.id,
      );
      console.log(
        "Moved Mesh New Position:",
        movedMesh?.name,
        movedMesh?.X,
        movedMesh?.Y,
        movedMesh?.Z,
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

  const handleMeshClick = (event: {
    stopPropagation: () => void;
    object: THREE.Mesh<
      THREE.BufferGeometry<
        THREE.NormalBufferAttributes,
        THREE.BufferGeometryEventMap
      >,
      THREE.Material | THREE.Material[],
      THREE.Object3DEventMap
    >;
  }) => {
    event.stopPropagation();
    const clickedMesh = event.object as THREE.Mesh;
    if (!isMesh(clickedMesh)) return;
    const componentParent = clickedMesh.parent;

    restoreOriginalMaterials();

    if (selectedComponent === componentParent) {
      setSelectedComponent(null);
      setOriginalMaterials(new Map());
    } else {
      const newMaterialsMap = new Map();
      componentParent?.traverse((child) => {
        if (isMesh(child)) {
          newMaterialsMap.set(child, child.material);
          child.material = highlightMaterial;
        }
      });
      setSelectedComponent(componentParent as THREE.Mesh);
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
      {selectedComponent &&
        selectedTool !== "Select" &&
        selectedTool !== "Multi-Select" && (
          <TransformControls
            object={selectedComponent}
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
