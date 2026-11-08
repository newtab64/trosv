import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/ui/button";
import { Chip, Skeleton } from "@/ui/badge";
import { EmptyState, ErrorState } from "@/ui/empty-state";
import { PageHeader } from "@/ui/page-header";
import { DeleteListingDialog } from "./landlord-dashboard/DeleteListingDialog";
import { ListingRow } from "./landlord-dashboard/ListingRow";
import { STATUS_FILTERS } from "./landlord-dashboard/listingStatus";
import { useMyListings } from "./landlord-dashboard/useMyListings";

/** The landlord's own listings: filter by status, open, edit or delete. */
export default function LandlordDashboard() {
  useDocumentTitle("Quản lý tin đăng · TROSV");
  const my = useMyListings();

  return (
    <>
      <PageHeader
        title="Quản lý tin đăng"
        className="max-w-5xl px-5 sm:px-5 lg:px-5"
        description={
          <span aria-live="polite" className="tabular-nums">
            {my.rows.length} tin
          </span>
        }
        actions={
          <Button asChild variant="primary">
            <Link to={ROUTES.LANDLORD_NEW}>Đăng tin mới</Link>
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-5xl p-5 pb-16">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.value}
              on={my.status === s.value}
              onClick={() => {
                my.setStatus(s.value);
              }}
            >
              {s.label}
            </Chip>
          ))}
        </div>

        {my.loading ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ) : my.error ? (
          <ErrorState message="Không tải được tin đăng." className="mt-6" />
        ) : my.rows.length === 0 ? (
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
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {my.rows.map((l) => (
              <ListingRow key={l.id} listing={l} onDelete={my.askDelete} />
            ))}
          </div>
        )}

        <DeleteListingDialog
          listing={my.pendingDelete}
          busy={my.deleting}
          onCancel={my.cancelDelete}
          onConfirm={() => void my.confirmDelete()}
        />
      </div>
    </>
  );
}
