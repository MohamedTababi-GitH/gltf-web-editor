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
} from "../ui/sidebar";

import { formatSize } from "@/lib/utils";
import { formatDateTime } from "@/utils/DateTime";

type SidebarProps = {
  model: ModelItem | null;
};

const AppSidebar = ({ model }: SidebarProps) => {
  // Null check
  if (!model) {
    return;
  }

  // metadata list
  const meta = [
    { label: "ID", value: model.id },
    { label: "Name", value: model.name },
    { label: "Size", value: formatSize(model.sizeBytes) },
    { label: "Format", value: model.format },
    { label: "Created On", value: formatDateTime(model.createdOn).fullStr },
  ];

  return (
    <Sidebar>
      <SidebarHeader>Metadata</SidebarHeader>
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
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
