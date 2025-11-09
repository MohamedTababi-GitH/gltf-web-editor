import { renderHook, act } from "@testing-library/react";
import { NotificationProvider, useNotification } from "./NotificationContext";
import { NotificationManager } from "../services/NotificationManager";

vi.mock("../services/NotificationManager", () => ({
  NotificationManager: {
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    subscribe: vi.fn(() => () => {}), // returns unsubscribe function
  },
}));

describe("NotificationContext (coverage test)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationProvider>{children}</NotificationProvider>
  );

  it("calls showNotification with different types", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.showNotification("Info message");
      result.current.showNotification("Success message", "success");
      result.current.showNotification("Error message", "error");
      result.current.showNotification("Warn message", "warn");
    });

    expect(NotificationManager.addNotification).toHaveBeenCalledTimes(4);
  });

  it("throws if used outside provider", () => {
    const useOutside = () => renderHook(() => useNotification());
    expect(useOutside).toThrow();
  });

  it("subscribes and unsubscribes to NotificationManager", () => {
    const subscribeSpy = vi.spyOn(NotificationManager, "subscribe");
    const { unmount } = renderHook(() => useNotification(), { wrapper });

    expect(subscribeSpy).toHaveBeenCalled();

    unmount(); // triggers cleanup
  });
});
