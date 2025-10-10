// src/components/ModelViewer/ModelViewer.tsx
import React, { useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders"; // enable GLB/GLTF

type ModelViewerProps = {
  modelPath?: string;
};

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelPath = "/models/SimpleModels.glb",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create engine & scene
    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    const scene = new BABYLON.Scene(engine);

    // Camera (ArcRotateCamera gives orbit/zoom/pan by default)
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 4,
      5,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);

    // Light
    new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);

    // Helper: compute center & radius for loaded meshes
    const computeCenterAndRadius = (meshes: BABYLON.AbstractMesh[]) => {
      if (!meshes.length) return { center: BABYLON.Vector3.Zero(), radius: 2 };
      const min = new BABYLON.Vector3(
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY
      );
      const max = new BABYLON.Vector3(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY
      );

      meshes.forEach((m) => {
        if (!m.getBoundingInfo) return;
        const bb = m.getBoundingInfo().boundingBox;
        const bmin = bb.minimumWorld;
        const bmax = bb.maximumWorld;
        min.x = Math.min(min.x, bmin.x);
        min.y = Math.min(min.y, bmin.y);
        min.z = Math.min(min.z, bmin.z);
        max.x = Math.max(max.x, bmax.x);
        max.y = Math.max(max.y, bmax.y);
        max.z = Math.max(max.z, bmax.z);
      });

      const center = BABYLON.Vector3.Center(min, max);
      const sizeX = max.x - min.x;
      const sizeY = max.y - min.y;
      const sizeZ = max.z - min.z;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      const radius = Math.max(maxSize / 2, 1);

      return { center, radius };
    };

    // Load GLB model
    BABYLON.SceneLoader.Append(
      "/models/", // root folder
      "shiba.glb", // file name only
      scene,
      (loadedScene) => {
        const meshes = loadedScene.meshes.filter((m) => m.isVisible);

        // Optional: move model up so bottom sits at y=0
        const minY = Math.min(
          ...meshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld.y)
        );
        meshes.forEach((m) => (m.position.y -= minY));

        const { center, radius } = computeCenterAndRadius(meshes);
        camera.setTarget(center);
        camera.radius = radius * 2.5;
        console.log("Model loaded:", modelPath);
      },
      undefined,
      (scene, message, exception) => {
        console.error("Model load error:", message, exception);
      }
    );

    // Render loop
    engine.runRenderLoop(() => scene.render());
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        engine.stopRenderLoop();
        scene.dispose();
        engine.dispose();
      } catch {
        /* empty */
      }
    };
  }, [modelPath]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100vh", display: "block" }}
    />
  );
};

export default ModelViewer;
