import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog.tsx";
import { Button } from "@/shared/components/button.tsx";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import type { StateFile } from "@/shared/types/StateFile.ts";

type CloseWarningDialogProps = {
  showCloseWarning: boolean;
  setShowCloseWarning: (show: boolean) => void;
  saveModel: (version?: string) => void;
  selectedVersion?: StateFile;
};

export function CloseWarningDialog({
  showCloseWarning,
  setShowCloseWarning,
  saveModel,
  selectedVersion,
}: Readonly<CloseWarningDialogProps>) {
  const { setIsModelViewer } = useNavigation();
  return (
    <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You have unsaved changes!</DialogTitle>
          <DialogDescription>
            Closing this view will discard your unsaved changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsModelViewer(false);
            }}
          >
            Discard and Close
          </Button>

          <Button
            onClick={() => {
              if (selectedVersion?.version === "Default") {
                saveModel();
              } else {
                saveModel(selectedVersion?.version);
              }
              setIsModelViewer(false);
            }}
            className="bg-chart-2 hover:bg-chart-2/90"
          >
            Save and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
