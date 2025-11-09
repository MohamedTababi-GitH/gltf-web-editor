import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import ThreeApp from "./ThreeApp";

const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockSetShowViewer = vi.fn();

// 1. Mock Contexts (The only critical logic areas)
vi.mock("@/contexts/HistoryContext.tsx", () => ({
  useHistory: vi.fn(() => ({
    undo: mockUndo,
    redo: mockRedo,
    undoStack: [1], // Enabled
    redoStack: [], // Disabled
  })),
}));

vi.mock("@/contexts/ModelContext.tsx", () => ({
  useModel: vi.fn(() => ({
    url: "mock-url",
    model: { additionalFiles: [] },
  })),
}));

// 2. Mock ALL other complex dependencies as simple placeholders
vi.mock("@/utils/ModelLoader.ts", () => ({
  loadModel: vi.fn(({ setProcessedModelUrl }) =>
    setProcessedModelUrl("mock-url")
  ),
}));
vi.mock("@react-three/drei", () => ({
  Center: ({ children }: any) => <div>{children}</div>,
  OrbitControls: () => null,
  Environment: () => null,
  Resize: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: any) => (
    <div data-testid="mock-canvas">{children}</div>
  ),
  useLoader: vi.fn(),
}));
vi.mock("./Model", () => ({ Model: () => <div data-testid="mock-model" /> }));
vi.mock("@/components/ModelViewer/Cursors.tsx", () => ({
  default: () => null,
}));
vi.mock("three", () => ({ MOUSE: {}, TOUCH: {} }));
vi.mock("@/components/ui/spinner.tsx", () => ({ Spinner: () => null }));

// 3. Mock UI components (Minimal structure for finding by icon/text)
vi.mock("@/components/ui/button.tsx", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={`btn-wrapper`}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/tooltip.tsx", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => null,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}));
vi.mock("@/components/ui/popover.tsx", () => ({
  Popover: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => null,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
}));
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x" data-name="Close" />,
  Undo2: () => <span data-testid="icon-undo" data-name="Undo" />,
  Redo2: () => <span data-testid="icon-redo" data-name="Redo" />,
  Keyboard: () => <span data-testid="icon-keyboard" />,
}));

const defaultProps = { setShowViewer: mockSetShowViewer };

beforeEach(() => {
  vi.clearAllMocks();
});

test("1. All three core buttons (Close, Undo, Redo) function correctly", () => {
  render(<ThreeApp {...defaultProps} />);

  // 1. Test Close Button (Find by icon mock's data-testid)
  const closeButton = screen.getByTestId("icon-x").closest("button");
  fireEvent.click(closeButton!);
  expect(mockSetShowViewer).toHaveBeenCalledWith(false);

  // 2. Test Undo Button (Find by icon mock's data-testid)
  const undoButton = screen.getByTestId("icon-undo").closest("button");
  expect(undoButton).not.toBeDisabled();
  fireEvent.click(undoButton!);
  expect(mockUndo).toHaveBeenCalledTimes(1);

  // 3. Test Redo Button (Find by icon mock's data-testid)
  const redoButton = screen.getByTestId("icon-redo").closest("button");
  expect(redoButton).toBeDisabled();
});
