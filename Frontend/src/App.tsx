import "./App.css";
import { ThemeProvider } from "@/shared/contexts/ThemeContext.tsx";
import Home from "@/pages/Home.tsx";
import { NotificationProvider } from "@/shared/contexts/NotificationContext.tsx";
import { NavigationProvider } from "@/shared/contexts/NavigationContext.tsx";
import { ModelProvider } from "@/shared/contexts/ModelContext.tsx";

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
