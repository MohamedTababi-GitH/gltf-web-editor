import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ModelUploadDialog from "../ModelUploadDialog.tsx";
import { useState } from "react";

export default function HomeView({
  setIsHome,
}: {
  setIsHome: (isHome: boolean) => void;
}) {
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

      <div className="container mx-auto px-6 text-center lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="hidden sm:flex sm:justify-center sm:mb-6">
            <Badge className="px-3 py-1 text-sm">
              Now supporting
              <span className="ml-1 font-bold text-indigo-500">.glb</span>
              <span className="mx-1">&amp;</span>
              <span className="font-bold text-indigo-500">.glTF</span>
            </Badge>
          </div>

          <h1 className="text-5xl font-light tracking-tight leading-tight sm:text-6xl">
            ECAD 3D Model Viewer
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            View, rotate, and interact with electronic CAD models directly in
            your browser — fast, accessible and powered by Babylon.js.
          </p>

          <div className="mt-10 flex items-center justify-center gap-x-4">
            <Button
              asChild
              onClick={() => {
                setShowingUpload(true);
              }}
            >
              <span>Upload a Model</span>
            </Button>

            <Button
              onClick={() => {
                setIsHome(false);
              }}
              variant="link"
              asChild
            >
              <span>Explore Models →</span>
            </Button>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -z-10 h-64 w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-600 to-cyan-400 opacity-20 blur-3xl"
      />
    </div>
  );
}
