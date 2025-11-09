import Navbar from "@/layout/Navbar.tsx";
import HomeView from "@/features/HomeView/components/HomeView.tsx";
import ListView from "@/features/ListView/components/ListView.tsx";
import { useNavigation } from "../contexts/NavigationContext.tsx";
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
            {activeTab === "home" ? <HomeView /> : <ListView />}
          </main>
        </div>
      )}
    </div>
  );
}

export default Home;
