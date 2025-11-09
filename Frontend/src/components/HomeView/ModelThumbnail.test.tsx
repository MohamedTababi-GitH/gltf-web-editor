import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import ModelThumbnail from "./ModelThumbnail";

// 1. Mock the file loading utility
vi.mock("@/utils/ModelLoader.ts", () => ({
  loadModel: vi.fn((config) => {
    setTimeout(() => {
      if (config.isMounted) {
        config.setProcessedModelUrl("blob:mock-model-url");
      }
    }, 0);
  }),
}));

// 2. Mock @react-three/fiber and Three.js components (FIXED EXPORTS)
vi.mock("@react-three/fiber", () => ({
  Canvas: vi.fn(({ children, onCreated }) => {
    const mockCanvasRefTarget = {
      toDataURL: vi.fn(() => "data:image/png;base64,mock-snapshot"),
    };

    const mockRendererState = {
      gl: {
        domElement: mockCanvasRefTarget,
      },
    };

    if (onCreated) {
      onCreated(mockRendererState as any);
    }
    return <div data-testid="mock-canvas">{children}</div>;
  }),
  useLoader: vi.fn(() => ({ scene: { uuid: "mock-scene" } })),
}));

// 3. Mock @react-three/drei and Three.js Loader (Prevent errors)
vi.mock("@react-three/drei", () => ({
  Environment: () => null,
  Center: ({ children }: any) => <div>{children}</div>,
  OrbitControls: () => null,
  Resize: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn(),
}));

const mockGltfFile = new File(["mock_gltf"], "model.gltf", {
  type: "model/gltf+json",
});
const mockOnSnapshot = vi.fn();

const defaultProps = {
  gltfFile: mockGltfFile,
  dependentFiles: [],
  onSnapshot: mockOnSnapshot,
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("1. Renders, triggers loading, and allows snapshot capture", async () => {
  vi.useFakeTimers();
  const { unmount } = render(<ModelThumbnail {...defaultProps} />);

  const captureButton = screen.getByText("Capture Thumbnail");

  // 1. Advance timers by 0ms to execute loadModel's setTimeout(0), setting the URL state.
  await act(async () => {
    vi.advanceTimersByTime(0);
  });

  // 2. Click the Capture button
  fireEvent.click(captureButton);

  expect(mockOnSnapshot).toHaveBeenCalledWith(
    "data:image/png;base64,mock-snapshot"
  );

  // 3. Assert the state change (Captured)
  expect(captureButton).toHaveTextContent("Captured");

  // 4. Advance time to reset button state (1.5 seconds)
  act(() => {
    vi.advanceTimersByTime(1500);
  });
  expect(captureButton).toHaveTextContent("Capture Thumbnail");

  unmount();
  vi.useRealTimers();
});
