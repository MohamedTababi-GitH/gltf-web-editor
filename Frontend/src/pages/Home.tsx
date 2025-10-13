import Navbar from "@/components/Navbar";
import HomeView from "@/components/HomeView/HomeView";
import ListView from "@/components/ListView/ListView";
import { useState } from "react";

function Home() {
  const [isHome, setIsHome] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      <Navbar isHome={isHome} setIsHome={setIsHome} />
      <main className="mt-16">
        {isHome ? <HomeView setIsHome={setIsHome} /> : <ListView />}
      </main>
    </div>
  );
}

export default Home;
