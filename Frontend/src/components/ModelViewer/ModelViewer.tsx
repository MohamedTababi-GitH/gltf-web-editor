import React, { useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders"; // enable GLB/GLTF
import AppSidebar from "./Sidebar";
import type { ModelItem } from "@/types/ModelItem";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";

type ModelViewerProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const ModelViewer: React.FC<ModelViewerProps> = ({ model, setShowViewer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { open } = useSidebar();
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const resizeTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!model) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const modelPath = model.url;
    if (!modelPath) return;

    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

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
      "",
      modelPath,
      scene,
      (loadedScene) => {
        const meshes = loadedScene.meshes.filter((m) => m.isVisible);

        if (meshes.length) {
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

    // Observe canvas resize and debounce engine.resize
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = window.setTimeout(() => {
        engine.resize();
        console.log("Canvas resized after layout finished");
      }, 100); // delay to not call this too quick
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, [model]);

  return (
    <div className="flex w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`transition-all duration-300 w-full ${open ? "md:w-[calc(100%-var(--sidebar-width))]" : "w-full"}`}
      />
      <SidebarTrigger
        className={` absolute 
            md:top-16 md:right-4
            top-18 right-2
            z-50 transition-all duration-300 ${open ? "md:right-[calc(var(--sidebar-width))]" : "right-0"}`}
      />
      <AppSidebar model={model} setShowViewer={setShowViewer} />
    </div>
  );
};

export default ModelViewer;
