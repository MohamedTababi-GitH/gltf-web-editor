import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Uploader } from "./Uploader";
import * as fileUploadHook from "@/hooks/use-file-upload.ts";

vi.mock("@/hooks/use-file-upload.ts");

describe("Uploader minimal coverage", () => {
  const onFileSelect = vi.fn();
  const setIsUploadDisabled = vi.fn();
  const setRequiredFiles = vi.fn();
  const resetFields = vi.fn();

  const emptyRootProps: any = {};
  const emptyInputProps: any = {};

  it("renders without crashing", () => {
    vi.mocked(fileUploadHook.useFileUpload).mockReturnValue({
      file: null,
      error: null,
      getRootProps: () => emptyRootProps,
      getInputProps: () => emptyInputProps,
      isDragActive: false,
      removeFile: vi.fn(),
      hasRequiredFiles: false,
      requiredFiles: [],
      additionalFiles: new Map(),
      getAdditionalRootProps: () => emptyRootProps,
      getAdditionalInputProps: () => emptyInputProps,
      isAdditionalDragActive: false,
      removeAdditionalFile: vi.fn(),
      allRequiredFilesUploaded: () => true,
    } as any); // cast to any to silence return-type checking

    render(
      <Uploader
        onFileSelect={onFileSelect}
        setIsUploadDisabled={setIsUploadDisabled}
        setRequiredFiles={setRequiredFiles}
        resetFields={resetFields}
      />
    );

    expect(screen.getByText(/Drag & drop your file here/i)).toBeInTheDocument();
    expect(screen.getByText(/\.glb or \.gltf/i)).toBeInTheDocument();
  });

  it("calls removeFile when file exists and remove button clicked", () => {
    const removeFileMock = vi.fn();

    vi.mocked(fileUploadHook.useFileUpload).mockReturnValue({
      file: new File(["test"], "test.glb", { type: "model/gltf-binary" }),
      error: null,
      getRootProps: () => emptyRootProps,
      getInputProps: () => emptyInputProps,
      isDragActive: false,
      removeFile: removeFileMock,
      hasRequiredFiles: false,
      requiredFiles: [],
      additionalFiles: new Map(),
      getAdditionalRootProps: () => emptyRootProps,
      getAdditionalInputProps: () => emptyInputProps,
      isAdditionalDragActive: false,
      removeAdditionalFile: vi.fn(),
      allRequiredFilesUploaded: () => true,
    } as any); // cast to any to silence return-type checking

    render(
      <Uploader
        onFileSelect={onFileSelect}
        setIsUploadDisabled={setIsUploadDisabled}
        setRequiredFiles={setRequiredFiles}
        resetFields={resetFields}
      />
    );

    const removeBtn = screen.getByRole("button");
    fireEvent.click(removeBtn);
    expect(removeFileMock).toHaveBeenCalled();
  });
});
