import AppSidebar from "./Sidebar";
import type { ModelItem } from "@/types/ModelItem";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import ThreeApp from "./ThreeApp";

type ModelViewerProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const ModelViewer: React.FC<ModelViewerProps> = ({ model, setShowViewer }) => {
  const { open } = useSidebar();
  console.log(model);
  return (
    <div className="flex w-full h-full overflow-hidden">
      <div
        className={`transition-all duration-300 w-full ${open ? "md:w-[calc(100%-var(--sidebar-width))]" : "w-full"}`}
      >
        <ThreeApp />
      </div>

      <SidebarTrigger
        className={` absolute 
            md:top-16 md:right-4
            top-18 right-2
            z-50 transition-all duration-300 ${open ? "md:right-[calc(var(--sidebar-width))]" : "right-0"}`}
      />
      <AppSidebar model={model} setShowViewer={setShowViewer} />
    </div>
  );
};

export default ModelViewer;
