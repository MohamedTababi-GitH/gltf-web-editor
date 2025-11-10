import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/alert-dialog.tsx";
import { Spinner } from "@/shared/components/spinner.tsx";
import type { StateFile } from "@/shared/types/StateFile.ts";

type DeleteVersionDialogProps = {
  showDeleteVersionWarning: boolean;
  setShowDeleteVersionWarning: (isOpen: boolean) => void;
  handleDeleteVersion: () => void;
  isDeleting: boolean;
  versionToDelete?: StateFile;
};

export function DeleteVersionDialog({
  showDeleteVersionWarning,
  setShowDeleteVersionWarning,
  handleDeleteVersion,
  isDeleting,
  versionToDelete,
}: Readonly<DeleteVersionDialogProps>) {
  return (
    <AlertDialog
      open={showDeleteVersionWarning}
      onOpenChange={setShowDeleteVersionWarning}
    >
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the version{" "}
            <b>
              <i>{versionToDelete?.version}</i>
            </b>{" "}
            and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteVersion}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? <Spinner /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
