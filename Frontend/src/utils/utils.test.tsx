import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatBytes } from "./BytesConverter";
import { formatDateTime } from "./DateTime";
import { loadModel } from "./ModelLoader";

describe("formatBytes", () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1048576)).toBe("1 MB");
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  it("respects decimal precision", () => {
    expect(formatBytes(1500, 1)).toBe("1.5 KB");
    expect(formatBytes(1555, 0)).toBe("2 KB");
  });
});

describe("formatDateTime", () => {
  it("returns formatted date and time strings", () => {
    const iso = "2024-01-01T12:34:00Z";
    const result = formatDateTime(iso);

    expect(result).toHaveProperty("dateStr");
    expect(result).toHaveProperty("timeStr");
    expect(result).toHaveProperty("fullStr");
    expect(typeof result.fullStr).toBe("string");
  });
});

describe("loadModel", () => {
  const mockUrl = "blob:mock-url";
  const revokeList: string[] = [];
  const setUrl = vi.fn();

  beforeEach(() => {
    revokeList.length = 0;
    setUrl.mockReset();
    vi.spyOn(URL, "createObjectURL").mockReturnValue(mockUrl);
  });

  it("handles .glb file correctly", async () => {
    const glbFile = new File([""], "model.glb", { type: "model/gltf-binary" });

    await loadModel({
      file: glbFile,
      dependentFiles: [],
      objectUrlsToRevoke: revokeList,
      setProcessedModelUrl: setUrl,
      isMounted: true,
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(glbFile);
    expect(setUrl).toHaveBeenCalledWith(mockUrl);
    expect(revokeList).toContain(mockUrl);
  });

  it("handles .gltf file and dependent files", async () => {
    // Mock a .gltf file with referenced images/buffers
    const gltfJson = {
      buffers: [{ uri: "buffer.bin" }],
      images: [{ uri: "texture.png" }],
    };

    const gltfFile = new File(["dummy"], "model.gltf", {
      type: "model/gltf+json",
    });

    // Mock the .text() method since it's missing in Vitest
    gltfFile.text = vi.fn(async () => JSON.stringify(gltfJson));

    const bufferFile = new File(["binarydata"], "buffer.bin", {
      type: "application/octet-stream",
    });

    const textureFile = new File(["imagedata"], "texture.png", {
      type: "image/png",
    });

    const revokeList: string[] = [];
    const setUrl = vi.fn();

    await loadModel({
      file: gltfFile,
      dependentFiles: [bufferFile, textureFile],
      objectUrlsToRevoke: revokeList,
      setProcessedModelUrl: setUrl,
      isMounted: true,
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(setUrl).toHaveBeenCalledWith(expect.stringContaining("blob:"));
    expect(revokeList.length).toBe(3);
  });
});
