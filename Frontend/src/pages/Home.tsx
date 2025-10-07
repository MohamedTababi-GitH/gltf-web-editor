import Navbar from "@/components/Navbar";
import HomeView from "@/components/HomeView/HomeView";
import ListView from "@/components/ListView/ListView";
import { useState } from "react";

function Home() {
  const [isHome, setIsHome] = useState(true);

  return (
    <div>
      <Navbar isHome={isHome} setIsHome={setIsHome} />
      <main className="pt-16">
        {isHome ? <HomeView setIsHome={setIsHome} /> : <ListView />}
      </main>
    </div>
  );
}

export default Home;
