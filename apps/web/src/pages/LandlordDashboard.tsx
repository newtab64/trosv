import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { getMyListings, deleteListing } from "@/api/landlordApi";
import type { Listing } from "@/types/api";
import { Button } from "@/ui/button";
import { Chip, Skeleton, Rating } from "@/ui/badge";
import { EmptyState, ErrorState } from "@/ui/empty-state";
import { HousePlaceholder } from "@/ui/icons";
import { toast } from "@/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapPin, ExternalLink, Edit3, Trash2 } from "lucide-react";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "available", label: "Còn trống" },
  { value: "rented", label: "Đã thuê" },
  { value: "hidden", label: "Ẩn" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  available: "Còn trống",
  rented: "Đã thuê",
  hidden: "Ẩn",
};

export default function LandlordDashboard() {
  useDocumentTitle("Quản lý tin đăng · TROSV");
  const navigate = useNavigate();
  const [rows, setRows] = useState<Listing[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Listing | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  // Render-phase reset: refetch on status change
  const [prevStatus, setPrevStatus] = useState(status);
  if (prevStatus !== status) {
    setPrevStatus(status);
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

  async function doDelete(): Promise<void> {
    if (!confirmDelete) return;
    setBusyDelete(true);
    try {
      await deleteListing(confirmDelete.id);
      setRows((r) => r.filter((x) => x.id !== confirmDelete.id));
      toast("Đã xóa tin đăng.");
      setConfirmDelete(null);
    } catch {
      toast("Không xóa được tin. Bạn thử lại nhé.");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            Quản lý tin đăng
          </h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted tabular-nums">
            {rows.length} tin
          </p>
        </div>
        <Button asChild variant="primary">
          <Link to={ROUTES.LANDLORD_NEW}>Đăng tin mới</Link>
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Chip
            key={s.value}
            on={status === s.value}
            onClick={() => {
              setStatus(s.value);
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState message="Không tải được tin đăng." className="mt-6" />
      ) : rows.length === 0 ? (
        /* Default Empty State */
        <EmptyState
          title="Chưa có tin đăng nào"
          description="Đăng tin đầu tiên để sinh viên tìm thấy phòng của bạn."
          action={
            <Button asChild>
              <Link to={ROUTES.LANDLORD_NEW}>Đăng tin</Link>
            </Button>
          }
          className="pt-10"
        />
      ) : (
        /* Grid of listings: items naturally align left (1 listing sits on the left column) */
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {rows.map((l) => (
            <div
              key={l.id}
              data-testid="listing-row"
              className="group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-line bg-card shadow-xs transition-all hover:border-line-strong hover:shadow-sm"
            >
              {/* Image thumbnail */}
              <div className="relative aspect-3/2 w-full sm:w-48 sm:shrink-0 overflow-hidden bg-tint">
                {l.cover_image ? (
                  <img
                    src={l.cover_image}
                    alt={l.title}
                    width={320}
                    height={213}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <HousePlaceholder />
                )}
                <div className="absolute top-2 left-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs backdrop-blur-xs",
                      l.status === "available" && "bg-moss/90 text-white",
                      l.status === "rented" && "bg-ink/80 text-white",
                      l.status === "hidden" && "bg-muted/90 text-white"
                    )}
                  >
                    <span className={cnDot(l.status)} aria-hidden />
                    {l.status ? STATUS_LABEL[l.status] ?? l.status : "Mới"}
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="flex flex-1 flex-col justify-between p-4 min-w-0">
                <div>
                  <Link
                    to={route(ROUTES.ROOM_DETAIL, { id: l.id })}
                    className="line-clamp-2 min-h-[2.75rem] font-semibold text-ink text-base hover:text-plate hover:underline transition-colors leading-snug"
                    title={l.title}
                  >
                    {l.title}
                  </Link>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-bold text-ink tabular-nums text-base">
                      {formatVnd(l.price)}
                      <span className="text-xs font-normal text-muted">/tháng</span>
                    </span>
                    {l.area_m2 != null ? (
                      <span className="text-xs font-medium text-muted">· {l.area_m2} m²</span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span>{l.address}</span>
                  </p>
                  <Rating value={l.avg_rating} count={l.reviews_count} className="mt-2 text-xs" />
                </div>

                {/* Card Actions toolbar */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <Link
                    to={route(ROUTES.ROOM_DETAIL, { id: l.id })}
                    className="text-xs font-medium text-plate hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    <span>Xem tin</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigate(route(ROUTES.LANDLORD_EDIT, { id: l.id }));
                      }}
                      className="h-8 px-2.5 text-xs flex items-center gap-1"
                    >
                      <Edit3 className="size-3.5" aria-hidden />
                      <span>Sửa</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid="delete-listing"
                      className="h-8 px-2.5 text-xs text-danger hover:bg-danger/10 flex items-center gap-1"
                      onClick={() => {
                        setConfirmDelete(l);
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      <span>Xóa</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog
        open={confirmDelete != null}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tin đăng?</DialogTitle>
            <DialogDescription>
              Tin "{confirmDelete?.title}" sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDelete(null);
              }}
            >
              Giữ lại
            </Button>
            <Button variant="danger" loading={busyDelete} onClick={() => { void doDelete(); }}>
              Xóa tin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cnDot(status: string | undefined): string {
  if (status === "available") return "inline-block size-1.5 rounded-full bg-white";
  if (status === "rented") return "inline-block size-1.5 rounded-full bg-white/70";
  if (status === "hidden") return "inline-block size-1.5 rounded-full bg-white/50";
  return "inline-block size-1.5 rounded-full bg-white";
}
