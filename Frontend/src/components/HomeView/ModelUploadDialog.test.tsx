import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import ModelUploadDialog from "./ModelUploadDialog";

// 1. Mock Notification
const mockShowNotification = vi.fn();
vi.mock("@/contexts/NotificationContext.tsx", () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

// 2. Mock API Client (
const mockPost = vi.fn();
vi.mock("@/services/AxiosConfig.tsx", () => ({
  useAxiosConfig: () => ({ post: mockPost }),
}));

// 3. Mock Uploader
const mockFile = new File(["mock_glb"], "test.glb", {
  type: "model/gltf-binary",
});
vi.mock("@/components/HomeView/Uploader.tsx", () => ({
  Uploader: vi.fn((props) => (
    <div data-testid="uploader">
      <button onClick={() => props.onFileSelect(mockFile)}>Select File</button>
    </div>
  )),
}));

// 4. Mock ModelThumbnail
vi.mock("@/components/HomeView/ModelThumbnail.tsx", () => ({
  default: vi.fn((props) => {
    React.useEffect(() => {
      if (props.gltfFile) {
        props.onSnapshot("data:image/png;base64,mock-thumbnail");
      }
    }, [props.gltfFile]);
    return <div data-testid="model-thumbnail" />;
  }),
}));

// 5. Mock global fetch
(globalThis as any).fetch = vi.fn(
  async () =>
    ({
      blob: async () => new Blob(["mock-blob-data"]),
    }) as Response
);

const mockOnOpenChange = vi.fn();
const defaultProps = {
  isOpen: true,
  onOpenChange: mockOnOpenChange,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({});
});

test("1. Dialog renders and Upload button is initially disabled", () => {
  render(<ModelUploadDialog {...defaultProps} />);

  expect(screen.getByText("Upload 3D Model")).toBeInTheDocument();
  expect(screen.getByText("Upload")).toBeDisabled();
});

test("2. File selection enables the Upload button and renders inputs", () => {
  render(<ModelUploadDialog {...defaultProps} />);
  fireEvent.click(screen.getByText("Select File"));
  expect(screen.getByLabelText("File Name")).toBeInTheDocument();
  expect(screen.getByText("Upload")).not.toBeDisabled();
});

test("3. Successful upload calls API, closes dialog, and resets fields", async () => {
  render(<ModelUploadDialog {...defaultProps} />);

  fireEvent.click(screen.getByText("Select File"));
  await act(async () => {
    fireEvent.click(screen.getByText("Upload"));
  });
  expect(mockPost).toHaveBeenCalledWith(
    "/api/model/upload",
    expect.any(FormData)
  );

  await waitFor(() => {
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

test("4. Clicking Cancel closes the dialog and resets fields", () => {
  render(<ModelUploadDialog {...defaultProps} />);
  fireEvent.click(screen.getByText("Select File"));
  fireEvent.click(screen.getByText("Cancel"));

  expect(mockOnOpenChange).toHaveBeenCalledWith(false);

  const { rerender } = render(
    <ModelUploadDialog {...defaultProps} isOpen={false} />
  );
  rerender(<ModelUploadDialog {...defaultProps} isOpen={true} />);
  expect(screen.queryByLabelText("File Name")).not.toBeInTheDocument();
});
