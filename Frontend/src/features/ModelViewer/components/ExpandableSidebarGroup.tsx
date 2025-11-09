import React, { useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from "@/features/ModelViewer/contexts/SidebarContext.tsx";
import { ChevronDown, ChevronRight } from "lucide-react";

type SidebarGroupProps = {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export const ExpandableSidebarGroup = ({
  label,
  children,
  defaultOpen = true,
}: SidebarGroupProps) => {
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
