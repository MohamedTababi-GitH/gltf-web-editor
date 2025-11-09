import AppToggle from "@/components/app-toggle.tsx";
import { ModeToggle } from "../components/mode-toggle.tsx";

export default function Navbar() {
  return (
    <header className="border-b px-4 md:px-6 fixed top-0 z-10 w-full bg-background">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="text-lg">ECAD</div>

        <AppToggle />
        <ModeToggle />
      </div>
    </header>
  );
}
