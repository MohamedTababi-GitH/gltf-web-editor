import "./App.css";
import { ThemeProvider } from "@/contexts/ThemeContext.tsx";
import Home from "@/pages/Home.tsx";
import { NotificationProvider } from "@/contexts/NotificationContext.tsx";
import { NavigationProvider } from "@/contexts/NavigationContext.tsx";
import { ModelProvider } from "./contexts/ModelContext.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NotificationProvider>
        <NavigationProvider>
          <ModelProvider>
            <Home />
          </ModelProvider>
        </NavigationProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
