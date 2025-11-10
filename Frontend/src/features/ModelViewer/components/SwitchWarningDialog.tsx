import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog.tsx";
import { Button } from "@/shared/components/button.tsx";
import type { StateFile } from "@/shared/types/StateFile.ts";

interface SwitchWarningDialogProps {
  showSwitchWarning: boolean;
  setShowSwitchWarning: (show: boolean) => void;
  handleSwitch: () => Promise<void> | void;
  selectedVersion?: StateFile;
  saveModel: (version?: string) => Promise<void>;
}

export function SwitchWarningDialog({
  showSwitchWarning,
  setShowSwitchWarning,
  handleSwitch,
  selectedVersion,
  saveModel,
}: Readonly<SwitchWarningDialogProps>) {
  return (
    <Dialog open={showSwitchWarning} onOpenChange={setShowSwitchWarning}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You have unsaved changes!</DialogTitle>
          <DialogDescription>
            Switching to a different version will discard your unsaved changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleSwitch}>
            Discard and Switch
          </Button>

          <Button
            onClick={async () => {
              try {
                if (selectedVersion?.version === "Default") {
                  await saveModel();
                } else {
                  await saveModel(selectedVersion?.version);
                }
                await handleSwitch();
              } catch (error) {
                console.error("Error during save and switch:", error);
              }
            }}
            className="bg-chart-2 hover:bg-chart-2/90"
          >
            Save and Switch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
