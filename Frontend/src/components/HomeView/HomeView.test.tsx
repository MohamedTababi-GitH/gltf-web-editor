import { render, screen, fireEvent } from "@testing-library/react";
import { vi, test, expect, beforeEach } from "vitest";
import HomeView from "./HomeView";

// 1. Mock useNavigation hook
const mockNavigateTo = vi.fn();
vi.mock("@/contexts/NavigationContext.tsx", () => ({
  useNavigation: () => ({
    navigateTo: mockNavigateTo,
  }),
}));

// 2. Mock ModelUploadDialog component
vi.mock("./ModelUploadDialog.tsx", () => ({
  default: vi.fn(({ isOpen, onOpenChange }) => (
    <div data-testid="mock-upload-dialog">
      {isOpen && (
        <>
          <p>Dialog is Visible</p>
          <button onClick={() => onOpenChange(false)}>Close Dialog</button>
        </>
      )}
    </div>
  )),
}));

// 3. Mock UI components that might have complex internal logic
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("1. Renders core static content", () => {
  render(<HomeView />);

  expect(screen.getByText(/ECAD 3D Model Viewer/i)).toBeInTheDocument();
  expect(
    screen.getByText(/View, rotate, and interact with electronic CAD models/i)
  ).toBeInTheDocument();
});

test("2. 'Upload a Model' button opens the dialog and the dialog can close", () => {
  render(<HomeView />);

  expect(screen.queryByText("Dialog is Visible")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("Upload a Model"));

  expect(screen.getByText("Dialog is Visible")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Close Dialog"));

  expect(screen.queryByText("Dialog is Visible")).not.toBeInTheDocument();
});

test("3. 'Explore Models' button calls navigateTo with 'model'", () => {
  render(<HomeView />);

  fireEvent.click(screen.getByText("Explore Models →"));

  expect(mockNavigateTo).toHaveBeenCalledWith("model");
});
