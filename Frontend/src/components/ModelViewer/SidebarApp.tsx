import React, { useEffect, useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox.tsx";

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

// AppSidebar.tsx

const PositionInput = ({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string; // string from mesh
  onCommit: (newValue: number) => void; // commit as number
}) => {
  const [localValue, setLocalValue] = useState(value);
  const committedByEnter = useRef(false); // <--- Add this ref

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commitValue = () => {
    if (committedByEnter.current) {
      committedByEnter.current = false;
      return;
    }
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      if (parsed.toFixed(3) !== parseFloat(value).toFixed(3)) {
        onCommit(parsed); // commit numeric value
      }
    } else {
      setLocalValue(value); // reset if invalid
    }
  };

  const commitOnEnter = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      if (parsed.toFixed(3) !== parseFloat(value).toFixed(3)) {
        committedByEnter.current = true; // Set flag before commit
        onCommit(parsed);
      }
    } else {
      setLocalValue(value);
    }
  };

  return (
    <div className="flex justify-between w-full text-left cursor-default pl-2">
      <span className="font-medium text-sidebar-foreground/70">{label}</span>
      <input
        type="text"
        value={localValue}
        className="w-25 text-left border rounded px-1"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitOnEnter();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
};

const AppSidebar = () => {
  const {
    model,
    meshes,
    toggleComponentVisibility,
    toggleComponentOpacity,
    updateMeshPosition,
  } = useModel();
  const [activeTab, setActiveTab] = useState<"metadata" | "components">(
    "metadata"
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
                  {/* X Position */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <PositionInput
                        label="X Position"
                        value={mesh.X}
                        onCommit={(newX) =>
                          updateMeshPosition(mesh.id, {
                            x: newX,
                            y: parseFloat(mesh.Y),
                            z: parseFloat(mesh.Z),
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
                            x: parseFloat(mesh.X),
                            y: newY,
                            z: parseFloat(mesh.Z),
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
                            x: parseFloat(mesh.X),
                            y: parseFloat(mesh.Y),
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
