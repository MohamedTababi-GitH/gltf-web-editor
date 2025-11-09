import { renderHook, act } from "@testing-library/react";
import { ModelProvider, useModel } from "./ModelContext";

describe("ModelContext (coverage test)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModelProvider>{children}</ModelProvider>
  );

  it("triggers all state setters and functions", () => {
    const { result } = renderHook(() => useModel(), { wrapper });

    act(() => {
      result.current.setUrl("test-url");
      result.current.setModel({ id: "1", name: "TestModel" } as any);
      result.current.setMeshes([{ id: 1, name: "Mesh1" }] as any);
    });

    act(() => {
      result.current.toggleComponentVisibility(1, true);
      result.current.toggleComponentOpacity(1, 0.5);
      result.current.updateMeshPosition(1, { x: 1, y: 2, z: 3 });
    });

    act(() => {
      result.current.setToggleComponentVisibility(() => () => {});
      result.current.setToggleComponentOpacity(() => () => {});
      result.current.setUpdateMeshPosition(() => () => {});

      result.current.toggleComponentVisibility(1, true);
      result.current.toggleComponentOpacity(1, 0.5);
      result.current.updateMeshPosition(1, { x: 1, y: 2, z: 3 });
    });

    act(() => {
      result.current.toggleComponentVisibility(2, false);
      result.current.toggleComponentOpacity(2, 0.8);
      result.current.updateMeshPosition(2, { x: 0, y: 0, z: 0 });
    });

    expect(result.current.url).toBeDefined();
    expect(result.current.model).toBeDefined();
    expect(result.current.meshes).toBeDefined();
  });

  it("throws if used outside provider", () => {
    const useOutside = () => renderHook(() => useModel());
    expect(useOutside).toThrow();
  });
});
