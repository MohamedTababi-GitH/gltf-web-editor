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
  const { setMeshes } = useModel();

  const groupRef = useRef<THREE.Group>(null);
  const [selectedComponents, setSelectedComponents] = useState<
    THREE.Object3D[]
  >([]);
  const originalMaterials = useRef(
    new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
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
    []
  );

  const updateSidebarMeshes = useCallback(
    (components: THREE.Object3D[]) => {
      setMeshes(
        components.map((component) => ({
          id: component.id,
          name: component.name || "Unnamed Component",
          X: component.position.x.toFixed(3),
          Y: component.position.y.toFixed(3),
          Z: component.position.z.toFixed(3),
        }))
      );
    },
    [setMeshes]
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

  const handleGizmoChange = useCallback(() => {
    if (selectedComponents.length > 0) {
      updateSidebarMeshes(selectedComponents);
    }
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
            child.material = highlightMaterial;
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

  const componentToControl = selectedComponents[0] as THREE.Mesh | undefined;

  return (
    <>
      {componentToControl &&
        selectedTool !== "Select" &&
        selectedTool !== "Multi-Select" && (
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
