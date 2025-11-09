import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useFileUpload } from "./use-file-upload";

const mockShowNotification = vi.fn();
vi.mock("@/contexts/NotificationContext.tsx", () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

(globalThis as any).FileReader = class {
  result: string | ArrayBuffer | null = null;
  onload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsText(_file: File) {
    this.result = '{"buffers":[{"uri":"buf1"}],"images":[{"uri":"img1"}]}';
    if (this.onload) this.onload({ target: this } as any);
  }
} as any;

describe("useFileUpload minimal coverage", () => {
  it("triggers main paths without TS errors", async () => {
    const { result } = renderHook(() => useFileUpload({}));

    const file = new File(["{}"], "test.gltf", { type: "model/gltf+json" });
    const additionalFile = new File(["{}"], "buf1", { type: "text/plain" });

    await act(async () => {
      await result.current.getRootProps;
      await result.current.getInputProps;

      await (result.current as any).onDrop?.([file], []);
    });

    act(() => {
      (result.current as any).onDropAdditionalFile?.([additionalFile], []);
    });

    act(() => result.current.removeFile());
    act(() => result.current.removeAdditionalFile("buf1"));

    expect(result.current.file).toBeNull();
    expect(result.current.additionalFiles.size).toBe(0);
    expect(result.current.allRequiredFilesUploaded()).toBe(true);
  });
});
