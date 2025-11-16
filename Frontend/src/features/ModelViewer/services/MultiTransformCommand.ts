import * as THREE from "three";
import type { ICommand } from "@/features/ModelViewer/types/ICommand.ts";

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
    updateCallback: (components: THREE.Object3D[]) => void
  ) {
    this.objects = objects;
    this.oldStates = oldStates;
    this.newStates = newStates;
    this.updateCallback = updateCallback;
  }

  public execute(): void {
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const state = this.newStates[i];
      if (!state) continue;
      obj.position.copy(state.position);
      obj.quaternion.copy(state.rotation);
      obj.scale.copy(state.scale);
      obj.visible = state.isVisible;
      this.applyOpacity(obj, state.opacity);
      obj.updateMatrixWorld();
    }

    this.updateCallback(this.objects);
  }

  public undo(): void {
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i];
      const state = this.oldStates[i];
      if (!state) continue;
      obj.position.copy(state.position);
      obj.quaternion.copy(state.rotation);
      obj.scale.copy(state.scale);
      obj.visible = state.isVisible;
      this.applyOpacity(obj, state.opacity);
      obj.updateMatrixWorld();
    }
    this.updateCallback(this.objects);
  }

  private applyOpacity(obj: THREE.Object3D, opacity: number) {
    obj.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const material = child.material;

      const setOpacity = (mat: THREE.Material) => {
        if ("opacity" in mat) {
          mat.transparent = true;
          mat.opacity = opacity;
          mat.needsUpdate = true;
        }
      };

      if (Array.isArray(material)) {
        material.forEach(setOpacity);
      } else {
        setOpacity(material);
      }
    });
  }
}
