import * as THREE from 'three';
import type { ICommand } from "../types/ICommand";

export type TransformState = {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
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
    this.objects.forEach((obj, i) => {
      const state = this.newStates[i];
      if (!state) return;

      obj.position.copy(state.position);
      obj.quaternion.copy(state.rotation);
      obj.scale.copy(state.scale);
      obj.updateMatrixWorld();
    });

    this.updateCallback(this.objects);
  }

  public undo(): void {
    this.objects.forEach((obj, i) => {
      const state = this.oldStates[i];
      if (!state) return;

      obj.position.copy(state.position);
      obj.quaternion.copy(state.rotation);
      obj.scale.copy(state.scale);
      obj.updateMatrixWorld();
    });
    
    this.updateCallback(this.objects);
  }
}