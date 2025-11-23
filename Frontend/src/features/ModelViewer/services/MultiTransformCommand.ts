import * as THREE from "three";
import type { ICommand } from "@/features/ModelViewer/types/ICommand.ts";
import { isMesh } from "@/features/ModelViewer/utils/ModelUtils.ts";

export type TransformState = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  isVisible: boolean;
  opacity: number;
};

export class MultiTransformCommand implements ICommand {
  private readonly objects: THREE.Object3D[];
  private readonly oldStates: TransformState[];
  private readonly newStates: TransformState[];

  private readonly updateCallback: (components: THREE.Object3D[]) => void;

  constructor(
    objects: THREE.Object3D[],
    oldStates: TransformState[],
    newStates: TransformState[],
    updateCallback: (components: THREE.Object3D[]) => void,
  ) {
    this.objects = objects;
    this.oldStates = oldStates;
    this.newStates = newStates;
    this.updateCallback = updateCallback;
  }

  private updateState(obj: THREE.Object3D, state: TransformState) {
    obj.position.copy(state.position);
    obj.quaternion.copy(state.rotation);
    obj.scale.copy(state.scale);
    obj.visible = state.isVisible;
    this.applyOpacity(obj, state.opacity);
    obj.updateMatrixWorld();
  }

  public execute(): void {
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const state = this.newStates[i];
      if (!state) continue;
      this.updateState(obj, state);
    }

    this.updateCallback(this.objects);
  }

  public undo(): void {
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const state = this.oldStates[i];
      if (!state) continue;
      this.updateState(obj, state);
    }
    this.updateCallback(this.objects);
  }

  private applyOpacity(obj: THREE.Object3D, opacity: number) {
    obj.traverse((child) => {
      if (!isMesh(child)) return;

      const material = child.material;

      const setOpacity = (mat: THREE.Material) => {
        if ("opacity" in mat) {
          mat.transparent = true;
          mat.opacity = opacity;
          mat.needsUpdate = true;
        }
      };

      if (Array.isArray(material)) {
        for (const mat of material) {
          setOpacity(mat);
        }
      } else {
        setOpacity(material);
      }
    });
  }
}
