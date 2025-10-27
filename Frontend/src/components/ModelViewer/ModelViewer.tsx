import AppSidebar from "./SidebarApp";
import type { ModelItem } from "@/types/ModelItem";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import ThreeApp from "./ThreeApp";
import React from "react";

type ModelViewerProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const ModelViewer: React.FC<ModelViewerProps> = ({ setShowViewer }) => {
  const { open } = useSidebar();
  return (
    <div className="flex w-full h-full overflow-hidden">
      <div
        className={`transition-all duration-300 w-full ${open ? "md:w-[calc(100%-var(--sidebar-width))]" : "w-full"}`}
      >
        <ThreeApp />
      </div>

      <SidebarTrigger
        className={` absolute 
            md:top-18 md:right-4
            top-18 right-2 md:h-10 md:w-10 h-8 w-8 bg-sidebar rounded-l-md 
            z-50 transition-all duration-300 ${open ? "md:right-[calc(var(--sidebar-width))] rounded-r-none" : "right-0 rounded-r-md"}`}
      />
      <AppSidebar setShowViewer={setShowViewer} />
    </div>
  );
};

export default ModelViewer;
