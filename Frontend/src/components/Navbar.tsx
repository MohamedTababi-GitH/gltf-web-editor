import AppToggle from "@/components/app-toggle";
import { ModeToggle } from "./mode-toggle";

export default function Navbar({
  isHome,
  setIsHome,
}: {
  isHome: boolean;
  setIsHome: (isHome: boolean) => void;
}) {
  return (
    <header className="border-b px-4 md:px-6 fixed top-0 z-10 w-full bg-background">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="text-lg font-semibold">ECAD</div>

        <AppToggle isHome={isHome} setIsHome={setIsHome} />

        <ModeToggle />
      </div>
    </header>
  );
}
