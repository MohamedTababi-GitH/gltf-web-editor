// trying it out a test a file
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

test("renders App and opens upload dialog", () => {
  render(<App />);

  // Check main heading exists
  expect(
    screen.getByRole("heading", { name: /ECAD 3D Model Viewer/i })
  ).toBeInTheDocument();

  // Check description exists
  expect(
    screen.getByText(/View, rotate, and interact with electronic CAD models/i)
  ).toBeInTheDocument();

  // Check "Upload a Model" button exists
  const uploadBtn = screen.getByText(/Upload a Model/i);
  expect(uploadBtn).toBeInTheDocument();

  // Simulate click to open upload dialog
  fireEvent.click(uploadBtn);

  // Expect the dialog title to appear
  expect(screen.getByText(/Upload 3D Model/i)).toBeInTheDocument();
});
