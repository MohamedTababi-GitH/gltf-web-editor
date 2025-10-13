// src/components/ModelViewer/ModelViewer.tsx
import React, { useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders"; // enable GLB/GLTF
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from "../ui/sidebar";

type ModelViewerProps = {
  modelPath: string | null; // the full URL to the GLB file
};

const ModelViewer: React.FC<ModelViewerProps> = ({ modelPath }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!modelPath) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    const scene = new BABYLON.Scene(engine);

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 4,
      5,
      BABYLON.Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);

    // Light
    new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);

    // Load model dynamically
    BABYLON.SceneLoader.Append(
      "", // no root folder, full path used
      modelPath,
      scene,
      (loadedScene) => {
        console.log("Model loaded:", modelPath);
        const meshes = loadedScene.meshes.filter((m) => m.isVisible);

        if (meshes.length) {
          // Center & scale camera
          const min = BABYLON.Vector3.Minimize(
            meshes.map((m) => m.getBoundingInfo().boundingBox.minimumWorld)[0],
            meshes[0].position,
          );
          const max = BABYLON.Vector3.Maximize(
            meshes.map((m) => m.getBoundingInfo().boundingBox.maximumWorld)[0],
            meshes[0].position,
          );
          const center = BABYLON.Vector3.Center(min, max);
          camera.setTarget(center);
        }
      },
      undefined,
      (_scene, msg, ex) => console.error("Model load error:", msg, ex),
    );

    engine.runRenderLoop(() => scene.render());
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, [modelPath]);

  return (
    <SidebarProvider>
      <Sidebar className={`z-50`}>
        <SidebarContent />
      </Sidebar>
      <main>
        <SidebarTrigger />
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100vh", display: "block" }}
        />
      </main>
    </SidebarProvider>
  );
};

export default ModelViewer;
