import Navbar from "@/components/Navbar";
import HomeView from "@/components/HomeView/HomeView";
import ListView from "@/components/ListView/ListView";
import { useNavigation } from "../contexts/NavigationContext.tsx";

function Home() {
  const { activeTab } = useNavigation();

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="mt-16 flex-1 min-h-0">
        {activeTab === "home" ? <HomeView /> : <ListView />}
      </main>
    </div>
  );
}

export default Home;
