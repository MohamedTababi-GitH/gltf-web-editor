import { useState } from "react";
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
import { Input } from "@/shared/components/input.tsx";
import { Spinner } from "@/shared/components/spinner.tsx";

type DeleteModelDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteModelDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
}: Readonly<DeleteModelDialogProps>) {
  const [confirmation, setConfirmation] = useState("");
  const handleOpenChange = (open: boolean) => {
    if (!open) setConfirmation("");
    onOpenChange(open);
  };

  const handleConfirm = () => {
    if (confirmation === "delete") {
      onConfirm();
    }
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the model and cannot be undone. <br />
            Type <span className="font-bold">delete</span> to confirm.
          </AlertDialogDescription>
          <Input
            type="text"
            name="delete-confirmation"
            className="mt-2"
            onChange={(e) => {
              setConfirmation(e.target.value);
            }}
            value={confirmation}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmation("");
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || confirmation !== "delete"}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? <Spinner /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
