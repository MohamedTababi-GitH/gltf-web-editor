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
import { useMutex } from "@/shared/hooks/useMutex.ts";

type CloseWarningDialogProps = {
  showCloseWarning: boolean;
  setShowCloseWarning: (show: boolean) => void;
  saveModel: (version?: string) => void;
  selectedVersion?: StateFile;
};
  id?: string;
}

export function CloseWarningDialog({
  showCloseWarning,
  setShowCloseWarning,
  saveModel,
  selectedVersion,
  id,
}: Readonly<CloseWarningDialogProps>) {
  const { setIsModelViewer } = useNavigation();
  const { unlockModel } = useMutex();
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
            onClick={async () => {
              if (id) await unlockModel(id);
              setIsModelViewer(false);
            }}
          >
            Discard and Close
          </Button>

          <Button
            onClick={async () => {
              if (selectedVersion?.version === "Default") {
                saveModel();
              } else {
                saveModel(selectedVersion?.version);
              }
              if (id) await unlockModel(id);
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
