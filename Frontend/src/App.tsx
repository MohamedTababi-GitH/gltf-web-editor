import "./App.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import Home from "@/pages/Home.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className={``}>
        <Home />
      </div>
    </ThemeProvider>
  );
}

export default App;
