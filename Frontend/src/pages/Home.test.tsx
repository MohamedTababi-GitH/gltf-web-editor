import { render, screen } from "@testing-library/react";
import { describe, it, vi, type Mock } from "vitest";
import Home from "./Home";

vi.mock("@/components/Navbar", () => ({ default: () => <div>Navbar</div> }));
vi.mock("@/components/HomeView/HomeView", () => ({
  default: () => <div>HomeView</div>,
}));
vi.mock("@/components/ListView/ListView", () => ({
  default: () => <div>ListView</div>,
}));

vi.mock("../contexts/NavigationContext.tsx", () => ({
  useNavigation: vi.fn(),
}));

import { useNavigation } from "../contexts/NavigationContext.tsx";

const mockedUseNavigation = useNavigation as unknown as Mock;

describe("Home component", () => {
  it("renders HomeView when activeTab is 'home'", () => {
    mockedUseNavigation.mockReturnValue({
      activeTab: "home",
      navigateTo: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Navbar")).toBeDefined();
    expect(screen.getByText("HomeView")).toBeDefined();
  });

  it("renders ListView when activeTab is not 'home'", () => {
    mockedUseNavigation.mockReturnValue({
      activeTab: "otherTab",
      navigateTo: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Navbar")).toBeDefined();
    expect(screen.getByText("ListView")).toBeDefined();
  });
});
