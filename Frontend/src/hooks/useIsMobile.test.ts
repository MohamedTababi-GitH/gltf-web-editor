import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

const MOBILE_BREAKPOINT = 768;

describe("useIsMobile", () => {
  let listeners: Record<string, Function[]> = {};

  beforeEach(() => {
    // Mock matchMedia
    listeners = {};
    window.matchMedia = vi.fn().mockImplementation((query) => {
      listeners[query] = [];
      return {
        matches: window.innerWidth < MOBILE_BREAKPOINT,
        media: query,
        addEventListener: (event: string, cb: Function) => {
          listeners[query].push(cb);
        },
        removeEventListener: (event: string, cb: Function) => {
          listeners[query] = listeners[query].filter((fn) => fn !== cb);
        },
        onchange: null,
        dispatchEvent: vi.fn(),
      };
    });
  });

  it("returns true for mobile width", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false for desktop width", () => {
    window.innerWidth = 1200;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when resize event fires", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());

    act(() => {
      window.innerWidth = 1024;
      Object.values(listeners).forEach((arr) => arr.forEach((fn) => fn()));
    });

    expect(result.current).toBe(false);
  });
});
