import type { ModelItem } from "@/types/ModelItem";
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  Sidebar,
  SidebarFooter,
} from "../ui/sidebar";

import { formatDateTime } from "@/utils/DateTime";
import { formatBytes } from "@/utils/BytesConverter.ts";
import { Minimize2 } from "lucide-react";

type SidebarProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const AppSidebar = ({ model, setShowViewer }: SidebarProps) => {
  // Null check

  if (!model) {
    return;
  }

  // metadata list
  const meta = [
    { label: "ID", value: model.id },
    { label: "Name", value: model.name },
    { label: "Size", value: formatBytes(model.sizeBytes) },
    { label: "Format", value: "." + model.format },
    { label: "Created On", value: formatDateTime(model.createdOn).fullStr },
  ];

  const closeModel = () => {
    setShowViewer(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className={`mt-2`}>Metadata</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Details</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {meta.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <div className="flex justify-between w-full text-left">
                      <span className="font-medium text-sidebar-foreground/70">
                        {item.label}
                      </span>
                      <span className="truncate text-sidebar-foreground">
                        {item.value}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter>
          <div
            onClick={closeModel}
            className="w-fit cursor-pointer flex items-center justify-end text-left bg-sidebar-background hover:bg-sidebar-foreground/10 rounded-md gap-2 p-2"
          >
            <Minimize2 className={`size-5`} />
            <span className="font-medium text-sidebar-foreground/70">
              Close Model
            </span>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
