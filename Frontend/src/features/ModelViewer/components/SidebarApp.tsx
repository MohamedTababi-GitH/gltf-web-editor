import { useState } from "react";
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
} from "../contexts/SidebarContext.tsx";
import { Slider } from "@/shared/components/slider.tsx";

import { formatDateTime } from "@/shared/utils/DateTime.ts";
import { formatBytes } from "@/shared/utils/BytesConverter.ts";
import { useModel } from "@/shared/contexts/ModelContext.tsx";
import { Checkbox } from "@/shared/components/checkbox.tsx";
import { ExpandableSidebarGroup } from "@/features/ModelViewer/components/ExpandableSidebarGroup.tsx";
import { PositionInput } from "./PositionInput.tsx";

const AppSidebar = () => {
  const {
    model,
    meshes,
    toggleComponentVisibility,
    toggleComponentOpacity,
    updateMeshPosition,
  } = useModel();
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
                      <PositionInput
                        label="X Position"
                        value={mesh.X}
                        onCommit={(newX) =>
                          updateMeshPosition(mesh.id, {
                            x: newX,
                            y: Number.parseFloat(mesh.Y),
                            z: Number.parseFloat(mesh.Z),
                          })
                        }
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <PositionInput
                        label="Y Position"
                        value={mesh.Y}
                        onCommit={(newY) =>
                          updateMeshPosition(mesh.id, {
                            x: Number.parseFloat(mesh.X),
                            y: newY,
                            z: Number.parseFloat(mesh.Z),
                          })
                        }
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <PositionInput
                        label="Z Position"
                        value={mesh.Z}
                        onCommit={(newZ) =>
                          updateMeshPosition(mesh.id, {
                            x: Number.parseFloat(mesh.X),
                            y: Number.parseFloat(mesh.Y),
                            z: newZ,
                          })
                        }
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <div className="flex justify-between w-full text-left cursor-default">
                        <span className="font-medium text-sidebar-foreground/70">
                          Is Visible
                        </span>
                        <Checkbox
                          checked={mesh.isVisible}
                          onCheckedChange={(checked) =>
                            toggleComponentVisibility(mesh.id, checked)
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
                        {Math.round((mesh.opacity ?? 1) * 100)}%
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
