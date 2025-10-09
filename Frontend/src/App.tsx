import "./App.css";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import Home from "@/pages/Home.tsx";
import { NotificationProvider } from "@/contexts/NotificationContext.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NotificationProvider>
        <Home />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
