import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { Listing } from "@/types/api";

/** "Xóa tin đăng?" confirmation; open while `listing` is set. */
export function DeleteListingDialog({
  listing,
  busy,
  onCancel,
  onConfirm,
}: {
  listing: Listing | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={listing != null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa tin đăng?</DialogTitle>
          <DialogDescription>
            Tin "{listing?.title}" sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn
            tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Giữ lại
          </Button>
          <Button variant="danger" loading={busy} onClick={onConfirm}>
            Xóa tin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
