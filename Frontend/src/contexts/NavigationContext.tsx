import { createContext, useContext, type ReactNode, useState } from "react";

type NavigationTab = "home" | "model";

interface NavigationContextType {
  activeTab: NavigationTab;
  navigateTo: (tab: NavigationTab) => void;
  isModelViewer: boolean;
  setIsModelViewer: (isModelViewer: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<NavigationTab>("home");
  const [isModelViewer, setIsModelViewer] = useState<boolean>(false);

  const navigateTo = (tab: NavigationTab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        navigateTo,
        isModelViewer,
        setIsModelViewer,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation() {
  const context = useContext(NavigationContext);

  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
}
