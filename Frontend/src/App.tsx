import "./App.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import Home from "@/pages/Home.tsx";
import { NotificationProvider } from "@/contexts/NotificationContext.tsx";
import { NavigationProvider } from "@/context/NavigationContext.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NotificationProvider>
        <NavigationProvider>
          <Home />
        </NavigationProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
