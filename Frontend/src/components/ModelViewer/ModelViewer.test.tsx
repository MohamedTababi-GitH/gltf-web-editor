import { render, screen } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import ModelViewer from "./ModelViewer";
import * as Sidebar from "../ui/sidebar";

const mockFn = vi.fn();
const mockSetShowViewer = vi.fn();

const mockSidebarBase = {
  state: "collapsed",
  setOpen: mockFn,
  setOpenMobile: mockFn,
  toggleSidebar: mockFn,
  toggleMobileSidebar: mockFn,
  openMobile: false,
};

const mockSidebarClosed = { ...mockSidebarBase, open: false };
const mockSidebarOpen = { ...mockSidebarBase, open: true, state: "expanded" };

// 1. Mock the Sidebar Hook and Trigger

vi.mock("../ui/sidebar", () => ({
  useSidebar: vi.fn(() => mockSidebarClosed as any),
  SidebarTrigger: ({ children, className }: any) => (
    <button data-testid="mock-trigger" className={className}>
      {children}
    </button>
  ),
}));

// 2. Mock Child Components (Pure placeholders)
vi.mock("./ThreeApp", () => ({
  default: vi.fn(({ setShowViewer }) => (
    <div
      data-testid="mock-three-app"
      data-set-show-viewer={
        typeof setShowViewer === "function" ? "mocked" : "fail"
      }
    />
  )),
}));
vi.mock("./SidebarApp", () => ({
  default: vi.fn(() => <div data-testid="mock-app-sidebar" />),
}));

// 3. Mock Context Provider (Pure Passthrough)
vi.mock("@/contexts/HistoryContext.tsx", () => ({
  HistoryProvider: ({ children }: any) => (
    <div data-testid="mock-history-provider">{children}</div>
  ),
}));

// --- MINIMAL COVERAGE TESTS ---

const defaultProps = {
  model: null,
  setShowViewer: mockSetShowViewer,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Sidebar.useSidebar as vi.Mock).mockImplementation(
    () => mockSidebarClosed as any
  );
});

test("1. Renders child components and applies default (closed) layout classes", () => {
  render(<ModelViewer {...defaultProps} />);
  expect(screen.getByTestId("mock-history-provider")).toBeInTheDocument();

  const canvasContainer = screen.getByTestId("mock-three-app").parentElement;
  expect(canvasContainer?.className).toContain("w-full");
  expect(canvasContainer?.className).not.toContain(
    "md:w-[calc(100%-var(--sidebar-width))]"
  );
});

test("2. Applies 'open' layout class when useSidebar returns open: true", () => {
  vi.mocked(Sidebar.useSidebar as vi.Mock).mockImplementation(
    () => mockSidebarOpen as any
  );

  render(<ModelViewer {...defaultProps} />);
  const canvasContainer = screen.getByTestId("mock-three-app").parentElement;
  expect(canvasContainer?.className).toContain(
    "md:w-[calc(100%-var(--sidebar-width))]"
  );
});
