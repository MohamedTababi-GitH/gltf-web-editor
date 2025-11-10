import { Badge } from "@/shared/components/badge.tsx";
import { Button } from "@/shared/components/button.tsx";
import { useNavigation } from "@/shared/contexts/NavigationContext";

export function HeroSection({
  setShowingUpload,
}: {
  readonly setShowingUpload: (show: boolean) => void;
}) {
  const { navigateTo } = useNavigation();
  return (
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
          View, rotate, and interact with electronic CAD models directly in your
          browser — fast, accessible and powered by Three.js.
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
              navigateTo("model");
            }}
            variant="link"
            asChild
          >
            <span>Explore Models →</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
