import Navbar from "@/layout/Navbar.tsx";
import HomeTab from "@/features/HomeTab/components/HomeTab.tsx";
import ModelsTab from "@/features/ModelsTab/components/ModelsTab.tsx";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import ModelViewer from "@/features/ModelViewer/components/ModelViewer.tsx";
import { SidebarProvider } from "@/features/ModelViewer/contexts/SidebarContext.tsx";

function Home() {
  const { activeTab, isModelViewer } = useNavigation();

  return (
    <div className="flex flex-col h-screen">
      {isModelViewer ? (
        <SidebarProvider>
          <div className="h-screen w-screen">
            <ModelViewer />
          </div>
        </SidebarProvider>
      ) : (
        <div>
          <Navbar />
          <main className="mt-16 flex-1 min-h-0">
            {activeTab === "home" ? <HomeTab /> : <ModelsTab />}
          </main>
        </div>
      )}
    </div>
  );
}

export default Home;
