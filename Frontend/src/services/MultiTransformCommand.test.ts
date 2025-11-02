import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { MultiTransformCommand } from "./MultiTransformCommand";
import type { TransformState } from "./MultiTransformCommand";

describe("MultiTransformCommand", () => {
  it("applies newStates on execute and oldStates on undo", () => {
    const obj = new THREE.Object3D();

    const oldState: TransformState = {
      position: new THREE.Vector3(1, 2, 3),
      rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
      scale: new THREE.Vector3(1, 1, 1),
    };

    const newState: TransformState = {
      position: new THREE.Vector3(4, 5, 6),
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.PI / 2, 0, 0)
      ),
      scale: new THREE.Vector3(2, 2, 2),
    };

    const updateCallback = vi.fn();

    const command = new MultiTransformCommand(
      [obj],
      [oldState],
      [newState],
      updateCallback
    );

    command.execute();
    expect(obj.position.equals(newState.position)).toBe(true);
    expect(obj.quaternion.equals(newState.rotation)).toBe(true);
    expect(obj.scale.equals(newState.scale)).toBe(true);
    expect(updateCallback).toHaveBeenCalledWith([obj]);

    command.undo();
    expect(obj.position.equals(oldState.position)).toBe(true);
    expect(obj.quaternion.equals(oldState.rotation)).toBe(true);
    expect(obj.scale.equals(oldState.scale)).toBe(true);
    expect(updateCallback).toHaveBeenCalledTimes(2);
  });

  it("handles multiple objects correctly", () => {
    const obj1 = new THREE.Object3D();
    const obj2 = new THREE.Object3D();

    const oldStates: TransformState[] = [
      {
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(1, 1, 1),
      },
      {
        position: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(2, 2, 2),
      },
    ];

    const newStates: TransformState[] = [
      {
        position: new THREE.Vector3(10, 0, 0),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(1, 1, 1),
      },
      {
        position: new THREE.Vector3(1, 10, 1),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(2, 2, 2),
      },
    ];

    const updateCallback = vi.fn();

    const command = new MultiTransformCommand(
      [obj1, obj2],
      oldStates,
      newStates,
      updateCallback
    );

    command.execute();
    expect(obj1.position).toEqual(newStates[0].position);
    expect(obj2.position).toEqual(newStates[1].position);

    command.undo();
    expect(obj1.position).toEqual(oldStates[0].position);
    expect(obj2.position).toEqual(oldStates[1].position);
  });
});
