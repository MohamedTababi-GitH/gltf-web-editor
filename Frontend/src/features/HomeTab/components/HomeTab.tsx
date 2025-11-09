import ModelUploadDialog from "./ModelUploadDialog.tsx";
import { useState } from "react";
import { HeroSection } from "@/features/HomeTab/components/HeroSection.tsx";

export default function HomeTab() {
  const [showingUpload, setShowingUpload] = useState(false);

  return (
    <div className="relative z-0 flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu blur-3xl"
      >
        <div
          className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-20"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 46.2% 74.4%, 36.2% 68.8%, 28.4% 59.3%, 0 65.9%, 17.5% 98.3%, 45.6% 94.2%, 63.8% 84.4%, 76.7% 64.6%)",
          }}
        />
      </div>

      <ModelUploadDialog
        isOpen={showingUpload}
        onOpenChange={setShowingUpload}
      />

      <HeroSection setShowingUpload={setShowingUpload} />

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -z-10 h-64 w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-600 to-cyan-400 opacity-20 blur-3xl"
      />
    </div>
  );
}
