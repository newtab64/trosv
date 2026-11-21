import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { getFavorites, removeFavorite } from "@/features/listings/api/favoritesApi";
import type { Listing } from "@/shared/types/api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { GateScreen, FavoritesGateIllustration } from "@/shared/layout/gates";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/badge";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, ErrorState } from "@/shared/ui/empty-state";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { toast } from "@/shared/ui/toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  useDocumentTitle("Yêu thích · TROSV");

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "student") return;
    getFavorites()
      .then((res) => {
        setListings(res.data);
      })
      .catch((err: unknown) => {
        setError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col bg-card">
        <GateScreen
          testId="favorites-gate"
          title="Lưu phòng bạn thích"
          description="Yêu thích giúp bạn sắp xếp và so sánh các phòng đang quan tâm. Đăng nhập để xem lại phòng đã lưu và tiếp tục theo dõi."
          illustration={<FavoritesGateIllustration />}
        />
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Chức năng này dành cho sinh viên"
          description="Bạn là chủ nhà. Về Quản lý tin đăng."
          action={
            <Button asChild>
              <Link to={ROUTES.LANDLORD}>Quản lý tin đăng</Link>
            </Button>
          }
        />
      </div>
    );
  }

  async function remove(listingId: number): Promise<void> {
    try {
      await removeFavorite(listingId);
      setListings((r) => r.filter((x) => x.id !== listingId));
      toast("Đã bỏ lưu phòng.");
    } catch {
      toast("Không bỏ lưu được phòng. Bạn thử lại nhé.");
    }
  }

  const band = (
    <PageHeader
      title="Phòng đã lưu"
      className="px-5 sm:px-5 lg:px-5"
      description={
        !loading && !error && listings.length > 0 ? (
          <span aria-live="polite" className="tabular-nums">
            {listings.length} phòng
          </span>
        ) : (
          "Những phòng bạn muốn xem lại và so sánh sau."
        )
      }
    />
  );

  if (loading) {
    return (
      <>
        {band}
        <div className="mx-auto w-full max-w-6xl flex-1 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {band}
        <div className="flex flex-1 items-center justify-center p-6">
          <ErrorState message={error} />
        </div>
      </>
    );
  }

  if (listings.length === 0) {
    return (
      <>
        {band}
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            illustration={<FavoritesGateIllustration />}
            title="Bạn chưa lưu phòng nào"
            description="Nhấn vào biểu tượng trái tim ở mỗi phòng để lưu lại và so sánh sau."
            action={
              <Button asChild>
                <Link to={ROUTES.ROOMS}>Tìm phòng ngay</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {band}
      <div className="mx-auto w-full max-w-6xl flex-1 p-5 pb-16">
        <div className="motion-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onFavToggle={() => void remove(l.id)}
              actionSlot={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-danger hover:bg-danger-tint hover:text-danger"
                  onClick={() => void remove(l.id)}
                >
                  Bỏ lưu
                </Button>
              }
            />
          ))}
        </div>
      </div>
    </>
  );
}
