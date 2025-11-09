import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, beforeEach } from "vitest";
import { vi } from "vitest";
import AppSidebar from "./SidebarApp";
import * as ModelContext from "@/contexts/ModelContext";

const mockFn = vi.fn();
const mockModelData = {
  name: "Model Name Check",
  categories: [],
  description: "",
  sizeBytes: 0,
  format: "",
  createdOn: "",
};
const mockMesh = {
  id: "mesh-123",
  name: "Mesh Name Check",
  X: "0",
  Y: "0",
  Z: "0",
  isVisible: true,
  opacity: 1,
};

const mockContextBase = {
  url: "mock-url",
  setUrl: mockFn,
  setModel: mockFn,
  setMeshes: mockFn,
  setSelectedMesh: mockFn,
  clearModel: mockFn,
  setError: mockFn,
  toggleComponentVisibility: mockFn,
  toggleComponentOpacity: mockFn,
  updateMeshPosition: mockFn,
};

const mockMetadataReturn = {
  ...mockContextBase,
  model: mockModelData,
  meshes: [],
};

const mockComponentsReturn = {
  ...mockContextBase,
  model: mockModelData,
  meshes: [mockMesh],
};

// 1. Mock Context: Define the mock implementation INLINE
vi.mock("@/contexts/ModelContext", () => ({
  useModel: vi.fn(() => mockMetadataReturn),
}));

// 2. Mock ALL Utility Functions (Prevent crashes)
vi.mock("@/utils/DateTime", () => ({
  formatDateTime: () => ({ fullStr: "Mock Date" }),
}));
vi.mock("@/utils/BytesConverter.ts", () => ({ formatBytes: () => "0 KB" }));

// 3. Mock ALL UI components (No external variables used)
vi.mock("../ui/sidebar", () => ({
  __esModule: true,
  SidebarHeader: ({ children }: any) => (
    <div data-testid="sidebar-header">{children}</div>
  ),
  SidebarContent: ({ children }: any) => (
    <div data-testid="sidebar-content">{children}</div>
  ),
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
  SidebarMenu: ({ children }: any) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: any) => <div>{children}</div>,
  SidebarMenuButton: ({ children, onClick }: any) => {
    if (onClick)
      return (
        <button onClick={onClick} data-testid="sidebar-button">
          {children}
        </button>
      );
    return children;
  },
  Sidebar: ({ children }: any) => (
    <div data-testid="sidebar-root">{children}</div>
  ),
  SidebarGroupLabel: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/slider", () => ({ Slider: () => null }));
vi.mock("lucide-react", () => ({
  ChevronDown: () => null,
  ChevronRight: () => null,
}));
vi.mock("@/utils/ModelLoader.ts", () => ({ loadModel: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ModelContext.useModel as vi.Mock).mockImplementation(
    () => mockMetadataReturn as any
  );
});

test("The component renders without crashing and displays critical data based on context mocks", () => {
  const { rerender } = render(<AppSidebar />);

  expect(screen.getByText("Model Name Check")).toBeInTheDocument();
  vi.mocked(ModelContext.useModel as vi.Mock).mockImplementation(
    () => mockComponentsReturn as any
  );
  rerender(<AppSidebar />);
  const meshesTab = screen.getByText("Meshes");
  fireEvent.click(meshesTab);
  expect(screen.getByText("Mesh Name Check")).toBeInTheDocument();
});
