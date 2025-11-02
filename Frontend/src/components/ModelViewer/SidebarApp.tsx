import React, { useEffect, useState } from "react";
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

const PositionInput = ({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (newValue: string) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local state when external 'value' prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);

    const parsedInput = parseFloat(inputValue);
    const parsedValue = parseFloat(value);

    // Check if a valid number and it's different from the committed value
    if (
      !isNaN(parsedInput) &&
      parsedInput.toString() === inputValue &&
      parsedInput !== parsedValue
    ) {
      onCommit(parsedInput.toString());
    }
  };

  const handleBlur = () => {
    // commit on blur if the local value is different from the committed prop value
    if (localValue !== value) {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed)) {
        onCommit(parsed.toString());
      } else {
        setLocalValue(value);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur(); // trigger handleBlur logic
    }
  };

  return (
    <div className="flex justify-between w-full text-left cursor-default  pl-2">
      <span className="font-medium text-sidebar-foreground/70">{label}</span>
      <input
        type="number"
        value={localValue}
        step={10}
        className="w-25 text-left border rounded px-1"
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
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
                            x: parseFloat(newX),
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
                            y: parseFloat(newY),
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
                            z: parseFloat(newZ),
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
