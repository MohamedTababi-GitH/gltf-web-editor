import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useMemo,
  useCallback,
} from "react";

type NavigationTab = "home" | "model";

type NavigationContextType = {
  activeTab: NavigationTab;
  navigateTo: (tab: NavigationTab) => void;
  isModelViewer: boolean;
  setIsModelViewer: (isModelViewer: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export function NavigationProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<NavigationTab>("home");
  const [isModelViewer, setIsModelViewer] = useState<boolean>(false);

  const navigateTo = useCallback(
    (tab: NavigationTab) => {
      if (activeTab !== tab) {
        setActiveTab(tab);
      }
    },
    [activeTab],
  );

  const memoizedValue = useMemo(
    () => ({
      activeTab,
      navigateTo,
      isModelViewer,
      setIsModelViewer,
    }),
    [activeTab, navigateTo, isModelViewer, setIsModelViewer],
  );

  return (
    <NavigationContext.Provider value={memoizedValue}>
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
