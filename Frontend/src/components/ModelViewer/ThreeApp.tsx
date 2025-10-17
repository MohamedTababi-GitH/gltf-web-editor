import { Center, OrbitControls, Environment, Resize } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Model } from "./Model";
import { Suspense } from "react";

export default function ThreeApp() {
  return (
    <Canvas>
      <color attach="background" args={["#888888"]} />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} />
        <Center>
          <Resize scale={5}>
            <Model />
          </Resize>
        </Center>
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}
