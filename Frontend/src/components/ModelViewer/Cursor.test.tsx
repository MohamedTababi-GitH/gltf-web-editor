import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import Cursors from "./Cursors";

const CursorEnum = {
  Select: "Select",
  MultiSelect: "MultiSelect",
  Move: "Move",
  Translate: "Translate",
  Scale: "Scale",
  Rotate: "Rotate",
} as const;

type CursorEnumType = (typeof CursorEnum)[keyof typeof CursorEnum];

// Minimal mock functions
const mockSetSelectedTool = vi.fn();

// 1. Mock UI components (Tooltip and Button)
vi.mock("@/components/ui/tooltip.tsx", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,

  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content-wrapper">{children}</div>
  ),
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button.tsx", () => ({
  Button: ({ children, onClick, className }: any) => (
    <button
      data-testid="tool-button"
      data-classes={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

// 2. Mock Icons
vi.mock("lucide-react", () => ({
  MousePointer: () => <span data-testid="icon-select" />,
  Move: () => <span data-testid="icon-move" />,
  RotateCw: () => <span data-testid="icon-rotate" />,
  SquareStack: () => <span data-testid="icon-multiselect" />,
  MoveHorizontal: () => <span data-testid="icon-translate" />,
  Scaling: () => <span data-testid="icon-scale" />,
}));

const defaultProps = {
  setSelectedTool: mockSetSelectedTool,
  selectedTool: CursorEnum.Select, // Default to 'Select' being active
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("1. Renders buttons and correctly sets the active/inactive state styles", () => {
  const props = { ...defaultProps, selectedTool: CursorEnum.Select };
  render(<Cursors {...props} />);

  const selectButton = screen.getByTestId("icon-select").closest("button");
  const moveButton = screen.getByTestId("icon-move").closest("button");

  expect(selectButton?.getAttribute("data-classes")).toContain(
    "bg-primary text-background"
  );

  expect(moveButton?.getAttribute("data-classes")).toContain(
    "bg-popover text-foreground"
  );
});

test("2. Click on a button calls setSelectedTool with the correct name ('Move')", () => {
  render(<Cursors {...defaultProps} />);

  const moveButton = screen.getByTestId("icon-move").closest("button");
  fireEvent.click(moveButton!);
  expect(mockSetSelectedTool).toHaveBeenCalledWith(CursorEnum.Move);
  expect(mockSetSelectedTool).toHaveBeenCalledTimes(1);
});

test("3. Tooltip content renders correctly using simple text query", () => {
  render(<Cursors {...defaultProps} />);

  const selectTooltip = screen.getByText("Select (S)");

  expect(selectTooltip).toBeInTheDocument();
});
