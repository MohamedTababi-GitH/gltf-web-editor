import { renderHook, act } from "@testing-library/react";
import { NavigationProvider, useNavigation } from "./NavigationContext";

describe("NavigationContext (coverage test)", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationProvider>{children}</NavigationProvider>
  );

  it("triggers state and navigation functions", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.activeTab).toBeDefined();

    act(() => {
      result.current.navigateTo("home");
    });
    act(() => {
      result.current.navigateTo("model");
    });

    expect(result.current.activeTab).toBe("model");

    act(() => {
      result.current.navigateTo("home");
    });

    expect(result.current.activeTab).toBe("home");
  });

  it("throws if used outside provider", () => {
    const useOutside = () => renderHook(() => useNavigation());
    expect(useOutside).toThrow();
  });
});
