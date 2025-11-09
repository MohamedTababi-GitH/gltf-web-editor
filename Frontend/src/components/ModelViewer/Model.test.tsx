import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Model } from "./Model";

// Mock required hooks and modules
vi.mock("@/contexts/ModelContext", () => ({
  useModel: () => ({
    setMeshes: vi.fn(),
    setToggleComponentVisibility: vi.fn(),
    setToggleComponentOpacity: vi.fn(),
    setUpdateMeshPosition: vi.fn(),
  }),
}));
vi.mock("@/contexts/HistoryContext", () => ({
  useHistory: () => ({
    addCommand: vi.fn(),
  }),
}));
vi.mock("three", () => ({
  ...vi.importActual("three"),
  Object3D: class {
    constructor() {
      // @ts-expect-error: Add custom properties for test coverage
      this.id = 1;
      // @ts-expect-error
      this.name = "Test";
      // @ts-expect-error
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        clone: () => ({ x: 0, y: 0, z: 0 }),
        set: vi.fn(),
      };
      // @ts-expect-error
      this.quaternion = { clone: () => ({}) };
      // @ts-expect-error
      this.scale = { clone: () => ({}) };
      // @ts-expect-error
      this.visible = true;
      // @ts-expect-error
      this.traverse = vi.fn();
    }
  },
  Mesh: class {},
  Group: class {},
  Color: class {},
  Material: class {},
  MeshStandardMaterial: class {},
  Box3: class {
    setFromObject() {
      return this;
    }
    getSize() {
      return { x: 1, y: 1, z: 1 };
    }
    getCenter() {
      return { x: 0, y: 0, z: 0 };
    }
  },
  Vector3: class {
    public x: number;
    public y: number;
    public z: number;
    constructor(x: number = 0, y: number = 0, z: number = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone(): any {
      // @ts-expect-error: Vector3 type not in scope in mock
      return new this.constructor(this.x, this.y, this.z);
    }
    set(x: number, y: number, z: number): this {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  },
}));
vi.mock("@react-three/fiber", () => ({
  useLoader: () => ({
    scene: {
      clone: () => ({
        traverse: vi.fn(),
        scale: { set: vi.fn() },
        position: { sub: vi.fn() },
      }),
    },
  }),
}));
vi.mock("@react-three/drei", () => ({
  TransformControls: () => null,
}));

describe("Model", () => {
  it("renders without crashing", () => {
    const setLoadingProgress = vi.fn();
    render(
      <Model
        processedUrl="test-url"
        setLoadingProgress={setLoadingProgress}
        selectedTool="Select"
      />
    );
    expect(setLoadingProgress).not.toThrow();
  });
});
