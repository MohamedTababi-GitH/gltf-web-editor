import { Spinner } from "@/shared/components/spinner.tsx";

export function Loading({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <Spinner className="text-primary w-20 h-20" />
      <p className="mt-4 font-medium">Loading Model ({progress}%)</p>
    </div>
  );
}
