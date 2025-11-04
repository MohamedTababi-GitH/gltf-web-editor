import Navbar from "@/components/Navbar";
import HomeView from "@/components/HomeView/HomeView";
import ListView from "@/components/ListView/ListView";
import { useNavigation } from "../contexts/NavigationContext.tsx";
import ModelViewer from "@/components/ModelViewer/ModelViewer.tsx";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";

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
