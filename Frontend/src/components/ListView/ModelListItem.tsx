import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import type { ModelItem } from "@/types/ModelItem.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ModelListItem({
  item,
  key,
  setModelPath,
  setShowViewer,
}: {
  key: string;
  item: ModelItem;
  setModelPath: (path: string) => void;
  setShowViewer: (show: boolean) => void;
}) {
  const theme = useTheme();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameOpen, setRenameOpen] = useState(false);
  const isDarkTheme =
    theme.theme === "dark" ||
    (theme.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const animationSrc = isDarkTheme
    ? "https://lottie.host/84a02394-70c0-4d50-8cdb-8bc19f297682/iIKdhe0iAy.lottie"
    : "https://lottie.host/686ee0e1-ae73-4c41-b425-538a3791abb0/SB6QB9GRdW.lottie";

  const formatSize = (size: number) => {
    const inMB = size / 1024 / 1024;
    if (inMB < 1) {
      return (size / 1024).toFixed(2) + " KB";
    }
    return inMB.toFixed(2) + " MB";
  };

  return (
    <Card
      key={key}
      className="max-w-md pb-0 hover:cursor-pointer"
      onClick={() => {
        setShowViewer(true);
        setModelPath(item.url);
      }}
    >
      <CardHeader>
        <div
          className={`flex justify-between items-start break-words truncate gap-x-4`}
        >
          <CardTitle className={`text-sm md:text-lg break-words truncate`}>
            {item.name}
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <EllipsisVertical
                className={`w-7 min-w-7 h-8 py-1 bg-muted rounded-md border`}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32">
              <DropdownMenuItem
                className={`cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewer(true);
                  setModelPath(item.url);
                }}
              >
                Open
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => e.stopPropagation()}
                className={`cursor-pointer`}
              >
                <a href={item.url}>Download</a>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameOpen(true);
                }}
              >
                Rename
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                model.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isRenameOpen} onOpenChange={setRenameOpen}>
          <form>
            <DialogContent
              onClick={(e) => e.stopPropagation()}
              className="sm:max-w-[425px]"
            >
              <DialogHeader>
                <DialogTitle>Rename the model</DialogTitle>
                <DialogDescription>
                  Make changes to your model's name here. Click save when
                  you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name-1">Name</Label>
                  <Input id="name-1" name="name" defaultValue={item.name} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </form>
        </Dialog>

        <div className={`flex gap-x-2`}>
          <Badge className={`text-sm`} variant={"destructive"}>
            .{item.format}
          </Badge>
          <Badge className={`text-sm`}>{formatSize(item.sizeBytes)}</Badge>
          <Badge className={`text-sm`} variant={"date"}>
            {formatDateTime(item.createdOn).dateStr}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 rounded-2xl border-t-2 dark:bg-black">
        <DotLottieReact src={animationSrc} loop autoplay={false} />
      </CardContent>
    </Card>
  );
}

export default ModelListItem;
