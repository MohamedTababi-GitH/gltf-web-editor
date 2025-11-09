import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ListView from "./ListView.tsx";
//import React from "react"

// We first have to mock all external hooks & components
vi.mock("@/services/AxiosConfig.tsx", () => ({
  useAxiosConfig: () => ({
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          items: [
            { id: "1", name: "Model A", url: "/a.glb" },
            { id: "2", name: "Model B", url: "/b.glb" },
          ],
          nextCursor: null,
          hasMore: false,
          totalCount: 2,
        },
      }),
    ),
  }),
}));

vi.mock("@/contexts/ModelContext", () => ({
  useModel: () => ({
    model: null,
    setModel: vi.fn(),
    setUrl: vi.fn(),
  }),
}));

vi.mock("@/components/ThemeContext.tsx", () => ({
  useTheme: () => ({ theme: "light" }),
}));

// Then we mock UI subcomponents
vi.mock("@/components/ListView/ModelListItem.tsx", () => ({
  default: ({ item }: any) => <div data-testid="model-item">{item.name}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => (
    <input
      data-testid="search-input"
      {...props}
      onChange={(e) => props.onChange(e)}
    />
  ),
}));

vi.mock("@/components/ui/button.tsx", () => ({
  Button: ({ children, ...rest }: any) => (
    <button data-testid="button" {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/button-group", () => ({
  ButtonGroup: ({ children }: never) => (
    <div data-testid="button-group">{children}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu.tsx", () => ({
  DropdownMenu: ({ children }: never) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: never) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: never) => <div>{children}</div>,
  DropdownMenuSub: ({ children }: never) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: never) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: never) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children, onCheckedChange }: never) => (
    <div onClick={onCheckedChange}>{children}</div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: never) => <div>{children}</div>,
  ScrollBar: () => null,
}));

vi.mock("@lottiefiles/dotlottie-react", () => ({
  DotLottieReact: () => <div data-testid="loading-animation">Loading...</div>,
}));

// Testing part

describe("ListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    render(<ListView />);
    expect(screen.getByTestId("loading-animation")).toBeInTheDocument();
  });

  it("renders fetched model list after loading", async () => {
    render(<ListView />);
    await waitFor(() => {
      expect(screen.getAllByTestId("model-item")).toHaveLength(2);
    });
    expect(screen.getByText("Model A")).toBeInTheDocument();
    expect(screen.getByText("Model B")).toBeInTheDocument();
  });

  it("handles search input and button click", async () => {
    render(<ListView />);
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "Test model" } });
    const buttons = await screen.findAllByTestId("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(input).toHaveValue("Test model");
    });
  });
});
