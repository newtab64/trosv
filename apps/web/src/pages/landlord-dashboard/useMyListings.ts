import { useEffect, useState } from "react";
import { deleteListing, getMyListings } from "@/api/landlordApi";
import { toast } from "@/ui/toast";
import type { Listing } from "@/types/api";

/** The landlord's listings, filtered by status, with delete (asks first via `pendingDelete`). */
export function useMyListings() {
  const [rows, setRows] = useState<Listing[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Show the skeleton as soon as the filter changes, before the request starts.
  const [shownStatus, setShownStatus] = useState(status);
  if (shownStatus !== status) {
    setShownStatus(status);
    setLoading(true);
  }

  useEffect(() => {
    let active = true;
    getMyListings(1, status)
      .then((res) => {
        if (active) setRows(res.data);
      })
      .catch((err: unknown) => {
        if (active) setError(String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteListing(pendingDelete.id);
      setRows((r) => r.filter((x) => x.id !== pendingDelete.id));
      toast("Đã xóa tin đăng.");
      setPendingDelete(null);
    } catch {
      toast("Không xóa được tin. Bạn thử lại nhé.");
    } finally {
      setDeleting(false);
    }
  }

  return {
    rows,
    status,
    setStatus,
    loading,
    error,
    pendingDelete,
    askDelete: setPendingDelete,
    cancelDelete: () => {
      setPendingDelete(null);
    },
    confirmDelete,
    deleting,
  };
}
