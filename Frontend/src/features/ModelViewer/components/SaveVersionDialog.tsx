import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog.tsx";
import { Input } from "@/shared/components/input.tsx";
import { Button } from "@/shared/components/button.tsx";

type SaveVersionDialogProps = {
  versionModalOpen: boolean;
  setVersionModalOpen: (open: boolean) => void;
  versionName: string;
  setVersionName: (name: string) => void;
  saveModel: (version: string) => void;
};

export function SaveVersionDialog({
  versionModalOpen,
  setVersionModalOpen,
  versionName,
  setVersionName,
  saveModel,
}: Readonly<SaveVersionDialogProps>) {
  return (
    <Dialog open={versionModalOpen} onOpenChange={setVersionModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Version</DialogTitle>
          <DialogDescription>
            Enter a name for this version to save your changes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="e.g., 'My First Design'"
            maxLength={25}
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            className={`cursor-pointer`}
            variant="outline"
            onClick={() => {
              setVersionModalOpen(false);
              setVersionName("");
            }}
          >
            Cancel
          </Button>
          <Button
            className={`cursor-pointer`}
            onClick={() => {
              saveModel(versionName);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
