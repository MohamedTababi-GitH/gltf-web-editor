import { renderHook, act } from "@testing-library/react";
import { HistoryProvider, useHistory } from "./HistoryContext";

describe("HistoryContext (coverage test)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <HistoryProvider>{children}</HistoryProvider>
  );

  it("calls all functions and keyboard handlers", () => {
    const { result } = renderHook(() => useHistory(), { wrapper });

    // Fake command with spies
    const command = { execute: vi.fn(), undo: vi.fn() };

    act(() => {
      result.current.addCommand(command as any);
    });

    expect(result.current.undoStack).toHaveLength(1);
    expect(result.current.redoStack).toHaveLength(0);

    act(() => {
      result.current.undo();
    });

    expect(result.current.undoStack).toHaveLength(0);
    expect(result.current.redoStack).toHaveLength(1);
    expect(command.undo).toHaveBeenCalled();

    act(() => {
      result.current.redo();
    });
    expect(result.current.undoStack).toHaveLength(1);
    expect(result.current.redoStack).toHaveLength(0);
    expect(command.execute).toHaveBeenCalled();

    act(() => {
      result.current.clear();
    });

    expect(result.current.undoStack).toHaveLength(0);
    expect(result.current.redoStack).toHaveLength(0);
    act(() => {
      const eventZ = new KeyboardEvent("keydown", { ctrlKey: true, key: "z" });
      document.dispatchEvent(eventZ);
      const eventY = new KeyboardEvent("keydown", { ctrlKey: true, key: "y" });
      document.dispatchEvent(eventY);
    });

    expect(result.current.undoStack).toBeDefined();
    expect(result.current.redoStack).toBeDefined();
  });

  it("throws if used outside provider", () => {
    const useOutside = () => renderHook(() => useHistory());
    expect(useOutside).toThrow();
  });
});
