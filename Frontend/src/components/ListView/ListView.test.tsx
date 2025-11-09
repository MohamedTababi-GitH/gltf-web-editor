import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ListView from "./ListView";
import { act } from "react";
import * as AxiosConfig from "@/services/AxiosConfig.tsx";

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
      })
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

vi.mock("@/contexts/NavigationContext.tsx", () => ({
  useNavigation: () => ({
    setIsModelViewer: vi.fn(),
  }),
}));

vi.mock("@/components/theme-provider.tsx", () => ({
  useTheme: () => ({ theme: "light" }),
}));

vi.mock("@/components/ListView/ModelListItem.tsx", () => ({
  default: ({ item }: any) => (
    <div data-testid="model-item" onClick={() => {}}>
      {item.name}
    </div>
  ),
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
  ButtonGroup: ({ children }: any) => (
    <div data-testid="button-group">{children}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu.tsx", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSub: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children, onCheckedChange }: any) => (
    <div data-testid="dropdown-item" onClick={onCheckedChange}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
  ScrollBar: () => null,
}));

vi.mock("@lottiefiles/dotlottie-react", () => ({
  DotLottieReact: () => <div data-testid="loading-animation">Loading...</div>,
}));

describe("ListView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Pagination buttons
  it("renders pagination buttons when multiple pages", async () => {
    const mockGet = vi.fn(() =>
      Promise.resolve({
        data: {
          items: [
            { id: "1", name: "Model X", url: "/x.glb" },
            { id: "2", name: "Model Y", url: "/y.glb" },
          ],
          nextCursor: "cursor2",
          hasMore: true,
          totalCount: 24,
        },
      })
    );
    vi.spyOn(AxiosConfig, "useAxiosConfig").mockReturnValue({ get: mockGet });

    await act(async () => {
      render(<ListView />);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("model-item")).toHaveLength(2);
    });

    const buttons = screen.getAllByTestId("button");
    const prevBtn = buttons.find((b) =>
      (b.textContent || "").toLowerCase().includes("previous")
    );
    const nextBtn = buttons.find((b) =>
      (b.textContent || "").toLowerCase().includes("next")
    );

    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
    expect(prevBtn).toHaveAttribute("disabled");
  });

  // Test 2: No results state (Simulates empty API and checks “No models found” text)
  it("shows 'No models found' when API returns empty items", async () => {
    const mockGet = vi.fn(() =>
      Promise.resolve({
        data: {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount: 0,
        },
      })
    );
    vi.spyOn(AxiosConfig, "useAxiosConfig").mockReturnValue({ get: mockGet });

    await act(async () => {
      render(<ListView />);
    });

    await waitFor(() => {
      expect(screen.getByText(/no models found/i)).toBeInTheDocument();
    });
  });

  // Test 3: Favorites filter toggle
  it("toggles favorites filter and shows chip", async () => {
    const mockGet = vi.fn(() =>
      Promise.resolve({
        data: {
          items: [{ id: "1", name: "FavModel", url: "/fav.glb" }],
          nextCursor: null,
          hasMore: false,
          totalCount: 1,
        },
      })
    );
    vi.spyOn(AxiosConfig, "useAxiosConfig").mockReturnValue({ get: mockGet });

    await act(async () => {
      render(<ListView />);
    });

    const dropdownItems = await screen.findAllByTestId("dropdown-item");
    fireEvent.click(dropdownItems[0]); // click "Favourites only"

    await waitFor(() => {
      expect(screen.getByText(/favorites only/i)).toBeInTheDocument();
    });
  });
});
