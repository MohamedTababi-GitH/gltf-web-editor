import AppToggle from "@/shared/components/app-toggle.tsx";
import { ModeToggle } from "@/shared/components/mode-toggle.tsx";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import { Button } from "@/shared/components/button.tsx";

export default function Navbar() {
  const { navigateTo } = useNavigation();
  return (
    <header className="border-b px-4 md:px-6 fixed top-0 z-10 w-full bg-background">
      <div className="flex h-16 items-center justify-between gap-4">
        <Button
          variant={"ghost"}
          className="text-lg cursor-pointer"
          onClick={() => navigateTo("home")}
        >
          3CAD
        </Button>

        <AppToggle />
        <ModeToggle />
      </div>
    </header>
  );
}
