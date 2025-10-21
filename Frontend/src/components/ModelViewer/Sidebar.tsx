import { useState } from "react";
import type { ModelItem } from "@/types/ModelItem";
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  Sidebar,
} from "../ui/sidebar";

import { formatDateTime } from "@/utils/DateTime";
import { formatBytes } from "@/utils/BytesConverter.ts";
import { Minimize2, ChevronDown, ChevronRight } from "lucide-react";
import { useModel } from "@/contexts/ModelContext";

type SidebarProps = {
  model: ModelItem | null;
  setShowViewer: (show: boolean) => void;
};

const ExpandableSidebarGroup = ({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <SidebarGroup>
      <SidebarMenuButton
        className="flex justify-between cursor-pointer mb-2 text-base"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}

        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </SidebarMenuButton>

      {isOpen && (
        <SidebarGroupContent className="pl-4">
          <SidebarMenu className="border-l border-primary/20">
            {children}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
};

const AppSidebar = ({ model, setShowViewer }: SidebarProps) => {
  const { meshes } = useModel();
  if (!model) return null;

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
      <SidebarHeader className={`mt-2`}>
        <div
          onClick={closeModel}
          className="w-full cursor-pointer flex items-center justify-center text-center p-2 rounded-md bg-sidebar-background hover:bg-sidebar-foreground/10 gap-2"
        >
          <Minimize2 className={`size-5`} />
          <span className="font-medium text-sidebar-foreground/70">
            Close Model
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ExpandableSidebarGroup label="File Details" defaultOpen={true}>
          {meta.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild>
                <div className="flex justify-between w-full text-left cursor-default">
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
        </ExpandableSidebarGroup>

        <ExpandableSidebarGroup label="Mesh Tree" defaultOpen={false}>
          {meshes.map((mesh) => (
            <ExpandableSidebarGroup
              key={mesh.name}
              label={mesh.name}
              defaultOpen={false}
            >
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div className="flex justify-between w-full text-left cursor-default">
                    <span className="font-medium text-sidebar-foreground/70">
                      X Position
                    </span>
                    <span className="truncate text-sidebar-foreground">
                      {mesh.X}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div className="flex justify-between w-full text-left cursor-default">
                    <span className="font-medium text-sidebar-foreground/70">
                      Y Position
                    </span>
                    <span className="truncate text-sidebar-foreground">
                      {mesh.Y}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div className="flex justify-between w-full text-left cursor-default">
                    <span className="font-medium text-sidebar-foreground/70">
                      Z Position
                    </span>
                    <span className="truncate text-sidebar-foreground">
                      {mesh.Z}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </ExpandableSidebarGroup>
          ))}
        </ExpandableSidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
