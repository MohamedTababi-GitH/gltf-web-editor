import React, { useState } from "react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  Sidebar,
  SidebarGroupLabel,
} from "../ui/sidebar";
import { Slider } from "@/components/ui/slider";

import { formatDateTime } from "@/utils/DateTime";
import { formatBytes } from "@/utils/BytesConverter.ts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useModel } from "@/contexts/ModelContext";

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

const AppSidebar = () => {
  const { model, meshes, toggleComponentVisibility, toggleComponentOpacity } =
    useModel();
  const [activeTab, setActiveTab] = useState<"metadata" | "components">(
    "metadata",
  );

  if (!model) return null;

  const meta = [
    { label: "Name", value: model.name },
    {
      label: "Categories",
      value:
        model.categories?.length > 0 ? model.categories?.join(", ") : "N/A",
    },
    { label: "Description", value: model.description || "N/A" },
    { label: "Size", value: formatBytes(model.sizeBytes) },
    { label: "Format", value: "." + model.format },
    { label: "Created On", value: formatDateTime(model.createdOn).fullStr },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="">
        {/* Tabs */}
        <div className="flex mt-4 border-b border-sidebar-foreground/20">
          <button
            className={`flex-1 py-2 text-center cursor-pointer ${
              activeTab === "metadata"
                ? "border-b-2 border-primary font-medium"
                : "text-sidebar-foreground/70"
            }`}
            onClick={() => setActiveTab("metadata")}
          >
            File
          </button>
          <button
            className={`flex-1 py-2 text-center cursor-pointer ${
              activeTab === "components"
                ? "border-b-2 border-primary font-medium"
                : "text-sidebar-foreground/70"
            }`}
            onClick={() => setActiveTab("components")}
          >
            Meshes
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {activeTab === "metadata" && (
          <SidebarGroup>
            <SidebarGroupLabel>File metadata</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {meta.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild>
                      <div className="justify-between w-full h-fit items-start text-left cursor-default space-x-2">
                        <span className="font-medium text-sidebar-foreground/70">
                          {item.label}
                        </span>
                        <div className="text-sidebar-foreground text-end">
                          {item.value}
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeTab === "components" &&
          (meshes.length === 0 ? (
            <div className="p-4 text-sm opacity-70">
              No selected components currently
            </div>
          ) : (
            <ExpandableSidebarGroup
              label="Selected components"
              defaultOpen={true}
            >
              {meshes.map((mesh) => (
                <ExpandableSidebarGroup
                  key={mesh.name}
                  label={mesh.name}
                  defaultOpen={true}
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
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <div className="flex justify-between w-full text-left cursor-default">
                        <span className="font-medium text-sidebar-foreground/70">
                          Is Visible
                        </span>
                        <input
                          type="checkbox"
                          checked={mesh.isVisible}
                          onChange={(e) =>
                            toggleComponentVisibility(mesh.id, e.target.checked)
                          }
                          className="cursor-pointer"
                        />
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <div className="flex justify-between w-full text-left cursor-default p-1">
                      <span className="font-medium text-sidebar-foreground/70 px-1">
                        Opacity
                      </span>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[mesh.opacity ?? 1]}
                        onValueChange={(value: number[]) => {
                          const newOpacity = value[0];
                          toggleComponentOpacity(mesh.id, newOpacity);
                        }}
                        className="w-40 cursor-pointer"
                      />
                      <span className="text-xs w-8 text-right">
                        {Math.round(mesh.opacity ? mesh.opacity * 100 : 100)}%
                      </span>
                    </div>
                  </SidebarMenuItem>
                </ExpandableSidebarGroup>
              ))}
            </ExpandableSidebarGroup>
          ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
