import AppSidebar from "./SidebarApp";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import ThreeApp from "./ThreeApp";
import { HistoryProvider } from "@/contexts/HistoryContext.tsx";

const ModelViewer = () => {
  const { open, isMobile } = useSidebar();

  return (
    <HistoryProvider>
      <div className="flex w-full h-full overflow-hidden">
        <div
          className={`transition-all duration-300 w-full ${open ? "md:w-[calc(100%-var(--sidebar-width))]" : "w-full"}`}
        >
          <ThreeApp />
        </div>

        <SidebarTrigger
          className={` absolute 
            md:top-3 md:right-4
            top-18 md:h-10 md:w-10 h-8 w-8 bg-muted rounded-l-md 
            z-50 transition-all duration-300 ${open && !isMobile ? "md:right-[calc(var(--sidebar-width))] rounded-r-none" : "right-2 rounded-r-md"}`}
        />
        <AppSidebar />
      </div>
    </HistoryProvider>
  );
};

export default ModelViewer;
