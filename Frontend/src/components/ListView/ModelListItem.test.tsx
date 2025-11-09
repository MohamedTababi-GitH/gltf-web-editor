import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ModelListItem from "./ModelListItem";
import type { Category } from "@/types/Category";
import { NotificationProvider } from "@/contexts/NotificationContext";

// Mock matchMedia
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock DotLottieReact
vi.mock("@lottiefiles/dotlottie-react", () => ({
  DotLottieReact: () => <div data-testid="lottie-mock" />,
}));

const mockItem = {
  id: "1",
  name: "Test Model",
  description: "A test model",
  categories: ["Mechanical", "Electrical"] as unknown as Category[],
  createdOn: new Date().toISOString(),
  format: "glb",
  sizeBytes: 1024,
  url: "http://example.com/model.glb",
  isFavourite: false,
  isNew: true,
  additionalFiles: [],
};

describe("ModelListItem minimal coverage", () => {
  const refreshList = vi.fn();
  const onClick = vi.fn();

  it("renders and interacts minimally", () => {
    render(
      <NotificationProvider>
        <ModelListItem
          item={mockItem}
          refreshList={refreshList}
          onClick={onClick}
        />
      </NotificationProvider>
    );

    expect(screen.getByText("Test Model")).toBeInTheDocument();

    expect(screen.getByText("New")).toBeInTheDocument();

    const card = screen.getByText("Test Model").closest("div");
    if (card) fireEvent.click(card);

    const favButton = screen.getAllByRole("button")[0];
    fireEvent.click(favButton);

    expect(screen.getByTestId("lottie-mock")).toBeInTheDocument();
  });
});
